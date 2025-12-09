# GitHub Actions 自动化部署指南

## 概述

本指南将帮助你配置 GitHub Actions 来自动构建 Windows、macOS 和 Linux 版本的图片信息处理工具。

## 步骤 1: 创建 GitHub 仓库

1. 登录 [GitHub](https://github.com)
2. 点击右上角 "+" → "New repository"
3. 填写仓库信息：
   - Repository name: `image-info-tool`
   - Description: `图片信息批量处理工具（Rust重构版）`
   - Public (公开)
   - 不初始化 README（我们已经有了）
4. 点击 "Create repository"

## 步骤 2: 推送代码到 GitHub

```bash
# 进入项目目录
cd /Users/apple/Downloads/test

# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交更改
git commit -m "Initial commit: Image Info Tool v0.1.0"

# 添加远程仓库（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/image-info-tool.git

# 推送代码
git branch -M main
git push -u origin main
```

## 步骤 3: 更新仓库链接

在 `Cargo.toml` 中更新仓库链接：

```toml
repository = "https://github.com/YOUR_USERNAME/image-info-tool"
homepage = "https://github.com/YOUR_USERNAME/image-info-tool"
```

## 步骤 4: GitHub Actions 自动运行

推送代码后，GitHub Actions 会自动：
1. 运行测试
2. 构建三个平台的可执行文件
3. 上传构建产物

## 步骤 5: 创建第一个发布版本

### 方法 A: 通过 GitHub 界面
1. 进入仓库页面
2. 点击 "Releases" → "Create a new release"
3. 填写版本信息：
   - Tag: `v0.1.0`
   - Title: `v0.1.0 - 初始版本`
   - Description: 从 CHANGELOG.md 复制内容
4. 点击 "Publish release"

### 方法 B: 通过命令行
```bash
# 创建标签
git tag -a v0.1.0 -m "Initial release v0.1.0"

# 推送标签
git push origin v0.1.0
```

## 步骤 6: 下载构建产物

发布创建后，GitHub Actions 会自动：
1. 构建所有平台版本
2. 上传到 Release 页面
3. 生成 SHA256 校验和

下载链接：
- `image-info-tool-windows.zip` (Windows)
- `image-info-tool-macos.tar.gz` (macOS)
- `image-info-tool-linux.tar.gz` (Linux)

## GitHub Actions 工作流说明

### 1. CI 工作流 (`.github/workflows/ci.yml`)
- **触发条件**: Push 到 main/master、Pull Request、创建 Release
- **任务**:
  - **Test**: 代码格式化检查、Clippy 检查、运行测试
  - **Build**: 在 Ubuntu、macOS、Windows 上构建发布版本
  - **Release**: 创建 Release 时打包所有平台版本

### 2. 发布工作流 (`.github/workflows/publish.yml`)
- **触发条件**: 创建 Release 时
- **任务**: 发布到 crates.io（需要配置 token）

## 配置 Secrets（可选）

### 发布到 crates.io
1. 获取 crates.io token: https://crates.io/settings/tokens
2. 在 GitHub 仓库设置中添加 Secret:
   - Name: `CARGO_REGISTRY_TOKEN`
   - Value: 你的 crates.io token

## 故障排除

### 常见问题

1. **GitHub Actions 失败**
   - 检查日志中的错误信息
   - 确保 Cargo.toml 配置正确
   - 检查依赖是否可用

2. **构建产物缺失**
   - 确保 Release 创建成功
   - 检查 Actions 是否完成
   - 查看构建日志

3. **Windows 构建问题**
   - 确保使用正确的工具链
   - 检查 7zip 是否可用

### 本地测试工作流
```bash
# 安装 act（本地运行 GitHub Actions）
brew install act

# 运行 CI 工作流
act -j test
```

## 自动化流程总结

```
代码推送 → GitHub Actions 触发 → 测试通过 → 多平台构建 → 创建 Release → 自动打包 → 用户下载
```

## 后续维护

### 更新版本
1. 更新 `Cargo.toml` 中的版本号
2. 更新 `CHANGELOG.md`
3. 提交并推送代码
4. 创建新的 Release 标签

### 添加新功能
1. 在功能分支开发
2. 提交 Pull Request
3. 通过 CI 检查
4. 合并到 main 分支
5. 创建新版本 Release

## 资源链接

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Rust 发布指南](https://doc.rust-lang.org/cargo/reference/publishing.html)
- [Semantic Versioning](https://semver.org/)

现在你的图片信息处理工具已经具备了完整的 CI/CD 流水线！ 🚀