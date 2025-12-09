# Installation Guide

## Download Pre-built Binaries

### Windows
1. Download `windows.zip` from the [Releases](https://github.com/YOUR_USERNAME/image-info-tool/releases) page
2. Extract the ZIP file
3. Run `image-info-tool.exe`

### macOS
1. Download `macos.tar.gz` from the [Releases](https://github.com/YOUR_USERNAME/image-info-tool/releases) page
2. Extract the archive:
   ```bash
   tar xzf macos.tar.gz
   ```
3. Run the application:
   ```bash
   ./image-info-tool
   ```
   
   **Note**: On macOS, you may need to allow the app to run:
   - Right-click the app and select "Open"
   - Click "Open" in the security dialog

### Linux
1. Download `linux.tar.gz` from the [Releases](https://github.com/YOUR_USERNAME/image-info-tool/releases) page
2. Extract the archive:
   ```bash
   tar xzf linux.tar.gz
   ```
3. Make it executable:
   ```bash
   chmod +x image-info-tool
   ```
4. Run the application:
   ```bash
   ./image-info-tool
   ```

## Build from Source

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install) (1.70 or later)
- Cargo (comes with Rust)

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/image-info-tool.git
   cd image-info-tool
   ```

2. Build in release mode:
   ```bash
   cargo build --release
   ```

3. Run the application:
   ```bash
   # Windows
   .\target\release\image-info-tool.exe
   
   # macOS/Linux
   ./target/release/image-info-tool
   ```

## Verify Installation

To verify the installation was successful:

```bash
# Check version
./image-info-tool --version

# Check help
./image-info-tool --help
```

## Dependencies

### Runtime Dependencies
- **Windows**: No additional dependencies
- **macOS**: No additional dependencies
- **Linux**: X11 libraries (usually pre-installed)

### Build Dependencies
All build dependencies are automatically managed by Cargo.

## Troubleshooting

### Common Issues

1. **"Permission denied" on Linux/macOS**
   ```bash
   chmod +x image-info-tool
   ```

2. **"App can't be opened" on macOS**
   - Right-click the app and select "Open"
   - Or run from terminal: `xattr -d com.apple.quarantine image-info-tool`

3. **Missing libraries on Linux**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install libx11-dev libxcb1-dev libxrandr-dev libxi-dev
   
   # Fedora
   sudo dnf install libX11-devel libxcb-devel libXrandr-devel libXi-devel
   
   # Arch Linux
   sudo pacman -S libx11 libxcb libxrandr libxi
   ```

4. **Application crashes on startup**
   - Check system requirements
   - Ensure you have sufficient memory
   - Try running from terminal to see error messages

### System Requirements
- **OS**: Windows 10+, macOS 10.15+, Linux (glibc 2.31+)
- **RAM**: 512 MB minimum, 1 GB recommended
- **Disk**: 50 MB free space
- **CPU**: x86_64 architecture

## Updating

### Pre-built Binaries
Download the latest release from the [Releases](https://github.com/YOUR_USERNAME/image-info-tool/releases) page.

### From Source
```bash
cd image-info-tool
git pull
cargo build --release
```

## Uninstallation

### Windows
1. Delete the extracted folder
2. Delete any shortcuts you created

### macOS/Linux
```bash
# Delete the binary
rm image-info-tool

# If installed system-wide
sudo rm /usr/local/bin/image-info-tool
```

### From Source
```bash
# Remove the build directory
rm -rf target/

# Remove the source code
rm -rf image-info-tool/
```