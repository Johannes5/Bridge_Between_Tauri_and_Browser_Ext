// sidecar_manager.rs

use anyhow::{Context, Result};
use semver::Version;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Clone)]
pub struct SidecarConfig {
    /// Name of the sidecar binary without extension (e.g., "my_sidecar")
    pub binary_name: String,
    /// GitHub repository "owner/repo"
    pub github_repo: String,
    /// Name of the native messaging host (used in manifest filename)
    pub manifest_name: String,
    /// Optional description for manifest
    pub manifest_description: String,
    /// Extension id
    pub extension_id: String,
}

impl SidecarConfig {
    /// Platform‑specific binary filename (e.g., "my_sidecar.exe" on Windows)
    pub fn binary_filename(&self) -> String {
        if cfg!(windows) {
            format!("{}.exe", self.binary_name)
        } else {
            self.binary_name.clone()
        }
    }

    /// Expected asset name pattern for GitHub release based on current platform.
    /// Example: "my_sidecar-linux-x86_64", "my_sidecar-macos-aarch64"
    pub fn asset_pattern(&self) -> String {
        let os = std::env::consts::OS;
        let arch = std::env::consts::ARCH;
        let ext = if cfg!(windows) { ".exe" } else { "" };
        // Normalize architecture names to match your release asset naming
        let arch_normalized = match arch {
            "x86_64" => "x86_64",
            "aarch64" => "aarch64",
            _ => arch,
        };
        format!("{}-{}-{}{}", self.binary_name, os, arch_normalized, ext)
    }

    /// Path where the sidecar binary should be stored inside the Tauri app data directory.
    pub fn sidecar_install_path(&self, app_handle: &AppHandle) -> Result<PathBuf> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .context("failed to resolve app data dir")?;
        Ok(app_dir.join("sidecar").join(self.binary_filename()))
    }

    /// Path to the native messaging manifest JSON file.
    pub fn manifest_paths(&self) -> Result<Vec<PathBuf>> {
        let manifest_dirs = if cfg!(target_os = "macos") {
            let home_dir = dirs::home_dir().context("no home dir")?;
            // macOS: ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/
            vec![
                home_dir.join("Library/Application Support/Google/Chrome/NativeMessagingHosts"),
                home_dir.join("Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"),
                home_dir.join("Library/Application Support/Perplexity/Comet/NativeMessagingHosts"),
            ]
        } else if cfg!(target_os = "linux") {
            // Linux: ~/.config/google-chrome/NativeMessagingHosts/
            let config_dir = dirs::config_dir()
                .context("no config dir")?;
            vec![
                config_dir.join("google-chrome/NativeMessagingHosts"),
                config_dir.join("BraveSoftware/Brave-Browser/NativeMessagingHosts"),
                config_dir.join("Comet/NativeMessagingHosts"),
            ]
        } else if cfg!(windows) {
            let config_dir = dirs::config_local_dir()
                .context("no config dir")?;
            // Windows: registry, but we can use a file in the user's Chrome data
            vec![
                config_dir.join("Google\\Chrome\\User Data\\NativeMessagingHosts"),
                config_dir.join("BraveSoftware\\Brave-Browser\\User Data\\NativeMessagingHosts"),
                config_dir.join("Perplexity\\Comet\\User Data\\NativeMessagingHosts"),
            ]
        } else {
            anyhow::bail!("unsupported OS for native messaging manifest");
        };
        Ok(manifest_dirs)
    }
}
#[derive(Debug, serde::Deserialize)]
struct GitHubRelease {
    tag_name: String,
    assets: Vec<GitHubAsset>,
}

#[derive(Debug, serde::Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
}

pub struct GitHubUpdater {
    client: reqwest::Client,
    repo: String,
}

impl GitHubUpdater {
    pub fn new(repo: String) -> Self {
        Self {
            client: reqwest::Client::builder()
                .user_agent("Tauri-Sidecar-Updater")
                .build()
                .unwrap(),
            repo,
        }
    }

    /// Fetch the latest release from GitHub.
    pub async fn get_latest_release(&self) -> Result<GitHubRelease> {
        let url = format!("https://api.github.com/repos/{}/releases/latest", self.repo);
        let response = self
            .client
            .get(&url)
            .send()
            .await
            .context("failed to fetch latest release")?;
        if !response.status().is_success() {
            anyhow::bail!("GitHub API returned {}", response.status());
        }
        let release: GitHubRelease = response.json().await?;
        Ok(release)
    }

    /// Find the asset matching the given pattern (regex) for the current platform.
    pub fn find_asset_url<'a>(&self, release: &'a GitHubRelease, pattern: &str) -> Option<&'a str> {
        let re = regex::Regex::new(pattern).ok()?;
        release
            .assets
            .iter()
            .find(|asset| re.is_match(&asset.name))
            .map(|a| a.browser_download_url.as_str())
    }
}

/// Get currently installed version by executing the sidecar with `--version`.
fn get_installed_version(binary_path: &Path) -> Result<Version> {
    let output = std::process::Command::new(binary_path)
        .arg("--version")
        .output()
        .context("failed to run sidecar --version")?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    // Extract version using regex, e.g., r"(\d+\.\d+\.\d+)"
    let re = regex::Regex::new(r"(\d+\.\d+\.\d+)")?;
    let caps = re.captures(&stdout).context("no version found in output")?;
    let version_str = caps.get(1).unwrap().as_str();
    Version::parse(version_str).context("invalid version string")
}

/// Write a version file as a fallback when sidecar can't be executed.
fn write_version_file(version: &Version, path: &Path) -> Result<()> {
    std::fs::write(path, version.to_string())?;
    Ok(())
}

fn read_version_file(path: &Path) -> Result<Version> {
    let content = std::fs::read_to_string(path)?;
    Version::parse(content.trim()).context("invalid version file")
}

use futures_util::StreamExt;
use tempfile::NamedTempFile;

/// Download a file from `url` to a temporary location, then atomically replace `target_path`.
async fn download_and_replace(url: &str, target_path: &Path) -> Result<()> {
    let response = reqwest::get(url).await?;
    if !response.status().is_success() {
        anyhow::bail!("download failed with status {}", response.status());
    }

    // Create a temporary file in the same directory as target to ensure rename works across mounts
    let parent = target_path.parent().context("target path has no parent")?;
    let temp_file = NamedTempFile::new_in(parent)?;
    let temp_path = temp_file.path().to_owned();

    let mut stream = response.bytes_stream();
    let mut file = tokio::fs::File::create(&temp_path).await?;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        tokio::io::AsyncWriteExt::write_all(&mut file, &chunk).await?;
    }
    file.sync_all().await?;

    // On Unix, set executable permission
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&temp_path)?.permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&temp_path, perms)?;
    }

    // Atomically rename (on Unix rename is atomic; on Windows we may need extra care)
    tokio::fs::rename(&temp_path, target_path).await?;

    Ok(())
}

/// Create or update the Chrome native messaging host manifest.
fn write_native_manifest(config: &SidecarConfig, binary_path: &Path) -> Result<()> {
    for manifest_path in config.manifest_paths()? {
        if let Err(e) = std::fs::create_dir_all(manifest_path.clone()) {
            println!("native host path already exists {}", e);
        }
        let manifest_file = manifest_path.join(format!("{}.json", config.manifest_name));
        println!("writing manifest {}", manifest_file.display());

        let manifest = serde_json::json!({
        "name": config.manifest_name,
        "description": config.manifest_description,
        "path": binary_path.to_string_lossy(),
        "type": "stdio",
        "allowed_origins": [
            format!("chrome-extension://{}/", config.extension_id)
        ]
    });

        let content = serde_json::to_string_pretty(&manifest)?;
        std::fs::write(manifest_file, content)?;
    }


    Ok(())
}

pub struct SidecarManager {
    config: SidecarConfig,
    updater: GitHubUpdater,
}

impl SidecarManager {
    pub fn new(config: SidecarConfig) -> Self {
        let updater = GitHubUpdater::new(config.github_repo.clone());
        Self { config, updater }
    }

    /// Ensure the sidecar is installed (copied from bundle if not present) and manifest is set.
    pub fn ensure_installed(&self, app_handle: &tauri::AppHandle) -> Result<()> {
        let target_path = self.config.sidecar_install_path(app_handle)?;
        println!("Target Path: {}", target_path.display());
        if !target_path.exists() {
            // Copy from bundled resources to target_path
            let resource_path = app_handle
                .path()
                .resource_dir()
                .context("sidecar not found in resources")?;
            println!("Resource path: {}", resource_path.display());
            std::fs::create_dir_all(target_path.parent().unwrap())?;
            std::fs::copy(&resource_path.join(self.config.binary_filename()), &target_path)?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = std::fs::metadata(&target_path)?.permissions();
                perms.set_mode(0o755);
                std::fs::set_permissions(&target_path, perms)?;
            }
        }
        // Always update manifest in case path changed
        write_native_manifest(&self.config, &target_path)?;
        println!("Manifest written");
        Ok(())
    }

    /// Check for updates, download and install if newer version available.
    pub async fn check_and_update(&self, app_handle: &AppHandle) -> Result<Option<Version>> {
        let binary_path = self.config.sidecar_install_path(app_handle)?;
        if !binary_path.exists() {
            // Not installed yet; caller should ensure_installed first
            anyhow::bail!("sidecar not installed");
        }

        let current_version = get_installed_version(&binary_path)?;
        let latest_release = self.updater.get_latest_release().await?;
        let latest_version = Version::parse(latest_release.tag_name.trim_start_matches('v'))?;

        if latest_version <= current_version {
            return Ok(None);
        }

        let pattern = self.config.asset_pattern();
        let download_url = self
            .updater
            .find_asset_url(&latest_release, &pattern)
            .context(format!("no asset matching pattern '{}'", pattern))?;

        // Download and replace
        download_and_replace(download_url, &binary_path).await?;

        // Update manifest (path unchanged, but we may want to rewrite for consistency)
        write_native_manifest(&self.config, &binary_path)?;

        Ok(Some(latest_version))
    }
}