# 发布说明

本仓库具有独立的 Git 历史，可以作为 GitHub 源码仓库发布。原游戏仓库不参与推送。

## 本地检查

```bash
npm ci
npm run verify
npm run test:smoke
npm run package
npm run check:package
npm run test:package
git status
```

`verify` 检查脚本语法、加载顺序、三语场景结构、资源引用、测试及源码目录是否混入媒体或二进制。无素材审计也会扫描当前 Git 历史的文件名。

构建后会额外检查 `app.asar`：必需的桌面模块、页面依赖和章节文件必须存在，游戏文件必须保持纯文本。Windows 的 `test:package` 使用临时存储目录和仅回环地址的调试连接，直接验证生成的 EXE，不使用现有玩家存档。

确认 `LICENSE` 的版权主体符合项目实际贡献者，并在 README 中填写你希望公开的项目介绍与联系渠道。当前沿用原项目声明的 ISC 许可证。

## 推送 GitHub

在你的 GitHub 账号或组织下创建一个空仓库，不要自动添加 README、许可证或 `.gitignore`，然后使用新仓库页面给出的地址：

```bash
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

`YOUR_ACCOUNT` 和 `YOUR_REPOSITORY` 需要替换成你实际创建的地址。本地模板没有保存 GitHub 凭据或设置远端。

默认工作流在 Windows 和 Linux 上运行源码验证。实际桌面打包建议在 Windows 上执行 `npm run dist`，生成的 ZIP 在 `dist/`，不提交发行产物到源码历史。

Windows 可能短暂占用刚生成的 EXE。构建入口对输出目录中的 EXE 写入执行有限重试，仍保留 ASAR 完整性和 Electron fuses 配置；持续失败时会正常报错。

## 维护

新增功能时把可复用逻辑留在核心模块，作品专有数据放在配置和剧情目录。推送前执行 `npm run verify`。本模板不依赖原游戏目录，移动到其他电脑后可以独立安装和运行。
