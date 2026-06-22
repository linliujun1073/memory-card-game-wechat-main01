$ErrorActionPreference = "Stop"

$reportPath = "C:\Users\Administrator\Desktop\memory-card-game-wechat-main\实验报告.md"
$docxPath = "C:\Users\Administrator\Desktop\memory-card-game-wechat-main\实验报告.docx"

$markdownContent = Get-Content -Path $reportPath -Raw -Encoding UTF8

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false

    $doc = $word.Documents.Add()

    $doc.Content.Text = $markdownContent

    $saveFormat = [Microsoft.Office.Interop.Word.WdSaveFormat]::wdFormatDocumentDefault
    $doc.SaveAs([ref]$docxPath, [ref]$saveFormat)

    Write-Host "Word document created successfully: $docxPath"

    $doc.Close()
    $word.Quit()

    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null

} catch {
    Write-Host "Error creating Word document: $_"
    try {
        $word.Quit() | Out-Null
    } catch {}
}