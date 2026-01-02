# NPM Trusted Publishing (OIDC) 設定ガイド

このプロジェクトは、NPM Trusted Publishing（OIDC認証）に対応しています。トークン管理が不要で、より安全なパッケージ公開が可能です。

## 🔧 事前準備

### 必須要件
- ✅ NPMアカウントでTwo-Factor Authentication（2FA）が有効化されていること
- ✅ npm CLI 11.5.1 以上（GitHub Actions内で自動更新されます）
- ✅ GitHub-hosted runnerを使用（self-hosted runnerは未対応）

## 📋 NPM側の設定手順

### 1. NPM.js でTrusted Publisherを設定

1. [NPM.js](https://www.npmjs.com/) にログイン
2. パッケージページに移動（`@nojaja/tokenize-comment`）
3. **Settings** タブを選択
4. **Publishing Access** セクションで **Trusted Publisher** を探す
5. **Add Trusted Publisher** をクリック

### 2. GitHub Actions連携の設定

以下の情報を入力してください：

| 項目 | 値 |
|------|-----|
| **Provider** | GitHub Actions |
| **Organization or user** | `nojaja` |
| **Repository** | `tokenize-comment` |
| **Workflow filename** | `release.yml` |
| **Environment name** | （空欄でOK） |

⚠️ **重要**: Repository名は `package.json` の `repository.url` と完全一致している必要があります（大文字小文字も含む）。

### 3. GitHub Secretsのクリーンアップ

古いトークン認証を使用していた場合：

1. GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions**
2. `NPM_TOKEN` シークレットを削除（存在する場合）

## 🚀 動作確認

### リリース作成でテスト

1. GitHubでReleaseを作成
2. GitHub Actionsが自動的にトリガーされます
3. ワークフローログで以下を確認：
   - ✅ テストが成功
   - ✅ OIDC認証でNPMにログイン
   - ✅ パッケージが公開される

## 🔐 セキュリティのメリット

### Trusted Publishingの利点

- ✨ **トークン管理不要**: 長期間有効なトークンを保存・管理する必要がありません
- 🔒 **短命トークン**: OIDCトークンはワークフロー実行時にのみ生成され、自動的に期限切れになります
- 📦 **Provenance自動生成**: パッケージの出所が自動的に検証可能になります
- 🛡️ **侵害リスク低減**: GitHub Secretsが漏洩しても、NPMアカウントは安全です

## 🔍 トラブルシューティング

### "Access token expired or revoked" エラー

**原因**: 古いトークン認証が残っている

**解決策**:
1. GitHub Secretsから `NPM_TOKEN` を削除
2. npm CLI 11.5.1 以上であることを確認（ワークフロー内で自動更新）
3. ワークフローを再実行

### "404 Not Found" エラー

**原因**: リポジトリ名の不一致

**解決策**:
1. `package.json` の `repository.url` を確認：
   ```json
   "repository": {
     "type": "git",
     "url": "git+https://github.com/nojaja/tokenize-comment.git"
   }
   ```
2. NPM Trusted Publisherの設定で **Repository** 欄が `tokenize-comment` であることを確認
3. 大文字小文字も完全一致している必要があります

### OIDC認証失敗

**原因**: 権限設定の不備

**解決策**:
1. ワークフローファイルに `permissions` セクションがあることを確認：
   ```yaml
   permissions:
     id-token: write  # OIDC認証に必須
     contents: read
   ```
2. GitHub-hosted runnerを使用していることを確認

### "You must sign up for private packages" エラー

**原因**: スコープ付きパッケージがプライベートとして扱われている

**解決策**:
- `npm publish` に `--access public` フラグが含まれていることを確認（ワークフローに既に設定済み）

## 📚 参考資料

- [NPM Trusted Publishers Documentation](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [npm provenance](https://github.blog/2023-04-19-introducing-npm-package-provenance/)

## ✅ 実装チェックリスト

- [x] `package.json` の `repository.url` を正しいオブジェクト形式に更新
- [x] GitHub Actionsワークフローを v4 にアップグレード
- [x] `permissions` セクションに `id-token: write` を追加
- [x] `NODE_AUTH_TOKEN` 環境変数を削除
- [x] `npm publish --access public` コマンドを使用
- [x] npm CLI を最新版に自動アップグレード（`npm install -g npm@latest`）
- [ ] NPM.js でTrusted Publisherを設定（手動実施）
- [ ] GitHub Secretsから古い `NPM_TOKEN` を削除（該当する場合）
- [ ] リリースを作成してテスト

---

**最終更新**: 2026年1月2日
