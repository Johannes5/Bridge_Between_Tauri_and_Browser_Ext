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
    let source_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap())
        .join("..")
        .join("..")
        .join("sidecar")
        .join("target")
        .join(profile);
    let target_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap())
        .join("..")
        .join("..")
        .join("sidecar")
        .join("target")
        .join("release");
    let source_path = source_dir.join(&orig_binary);
    println!("cargo:rerun-if-changed={}", source_path.display());
    let dest_path = target_dir.join(&new_binary);
    println!("{:?} {:?}", source_path, dest_path);
    fs::copy(source_path, dest_path).unwrap();
    tauri_build::build()
}

