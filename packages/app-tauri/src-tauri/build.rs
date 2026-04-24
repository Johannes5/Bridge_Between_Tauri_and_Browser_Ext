use std::env;
use std::path::PathBuf;
use std::fs;
fn main() {
    let target = env::var("TARGET").expect("TARGET not set");
    let profile = env::var("PROFILE").expect("PROFILE not set");

    let pkg_name = "bridge-sidecar".to_string();

    let orig_binary = if target.contains("windows") {
        format!("{}.exe", pkg_name)
    } else {
        pkg_name.clone()
    };

    let new_binary = if target.contains("windows") {
        format!("{}-{}.exe", pkg_name, target)
    } else {
        format!("{}-{}", pkg_name, target)
    };
    let target_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap())
        .join("..")
        .join("..")
        .join("sidecar")
        .join("target")
        .join(profile);
    let source_path = target_dir.join(&orig_binary);
    let dest_path = target_dir.join(&new_binary);
    fs::copy(source_path, dest_path).unwrap();
    tauri_build::build()
}

