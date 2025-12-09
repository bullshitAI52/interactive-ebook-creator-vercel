# Contributing to Image Info Tool

Thank you for your interest in contributing to Image Info Tool! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project.

## How Can I Contribute?

### Reporting Bugs
- Check if the bug has already been reported in [Issues](https://github.com/YOUR_USERNAME/image-info-tool/issues)
- Use the bug report template
- Include steps to reproduce, expected behavior, and actual behavior
- Include system information (OS, Rust version, etc.)

### Suggesting Enhancements
- Check if the enhancement has already been suggested
- Explain why this enhancement would be useful
- Provide examples of how it would work

### Pull Requests
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Setup

### Prerequisites
- Rust 1.70 or later
- Cargo

### Getting Started
1. Fork and clone the repository
   ```bash
   git clone https://github.com/YOUR_USERNAME/image-info-tool.git
   cd image-info-tool
   ```

2. Build the project
   ```bash
   cargo build
   ```

3. Run tests
   ```bash
   cargo test
   ```

4. Run the application
   ```bash
   cargo run
   ```

## Coding Standards

### Rust Style
- Follow the [Rust Style Guide](https://doc.rust-lang.org/1.0.0/style/README.html)
- Use `cargo fmt` to format code
- Use `cargo clippy` to check for common issues

### Commit Messages
- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters
- Reference issues and pull requests

### Documentation
- Document public APIs with Rustdoc comments
- Update README.md for user-facing changes
- Update CHANGELOG.md for significant changes

## Project Structure

```
src/
├── main.rs          # Application entry point
├── app_simple.rs    # Main GUI application
├── image_info.rs    # Image processing logic
├── utils.rs         # Utility functions
├── fonts.rs         # Font configuration
└── excel_export.rs  # CSV export functionality
```

## Testing

### Running Tests
```bash
# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run with verbose output
cargo test -- --nocapture
```

### Writing Tests
- Place unit tests in the same file as the code
- Place integration tests in `tests/` directory
- Test both success and error cases

## Release Process

### Versioning
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for added functionality (backwards compatible)
- **PATCH** version for bug fixes (backwards compatible)

### Release Checklist
1. Update version in `Cargo.toml`
2. Update `CHANGELOG.md`
3. Run all tests
4. Create a release tag
5. Push to GitHub (triggers automated builds)

## Questions?

- Open an [Issue](https://github.com/YOUR_USERNAME/image-info-tool/issues)
- Check the [README](README.md) for more information

Thank you for contributing! 🚀