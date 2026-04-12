param()

Set-Location -Path "C:\Users\noctu\Documents\AhorrAI"

# Check if there are any changes
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    # No changes, do nothing.
    exit 0
}

# There are changes. Add, commit and push.
git add .
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Auto-backup: $timestamp"
git push origin main
