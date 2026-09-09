//go:build windows

package main

import (
	"archive/zip"
	"bytes"
	_ "embed"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"
)

//go:embed extension.zip
var extensionZip []byte

const mbIconInformation = 0x40

func main() {
	localAppData := os.Getenv("LOCALAPPDATA")
	if localAppData == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			fail("ユーザーフォルダを特定できませんでした: " + err.Error())
		}
		localAppData = filepath.Join(home, "AppData", "Local")
	}

	dest := filepath.Join(localAppData, "CopilotSelecter", "extension")
	if err := os.RemoveAll(dest); err != nil && !os.IsNotExist(err) {
		fail("古いファイルを削除できませんでした: " + err.Error())
	}
	if err := os.MkdirAll(dest, 0o755); err != nil {
		fail("フォルダを作成できませんでした: " + err.Error())
	}
	if err := unzipBytes(extensionZip, dest); err != nil {
		fail("展開に失敗しました: " + err.Error())
	}

	manifest := filepath.Join(dest, "manifest.json")
	if _, err := os.Stat(manifest); err != nil {
		fail("展開後に manifest.json が見つかりません。ZIP が壊れている可能性があります。")
	}

	_ = copyClipboard(dest)
	_ = openExplorer(dest)
	browserName, opened := openExtensionsPage()

	hint := "Edge なら edge://extensions 、Chrome なら chrome://extensions を開いてください。"
	if opened {
		hint = browserName + " の拡張機能ページを開きました。"
	}

	info(
		"CopilotSelecter のファイルを配置しました。\n\n" +
			hint + "\n\n" +
			"あとはブラウザ側で 2 操作だけです（.exe からの自動インストールは禁止されています）:\n" +
			"1. 右上の「デベロッパーモード」をオン\n" +
			"2. 「パッケージ化されていない拡張機能を読み込む」で、次のフォルダを選ぶ\n\n" +
			dest + "\n\n" +
			"会社の Edge 152 では Copilot を https://m365.cloud.microsoft/chat の通常タブで開いてください。\n" +
			"フォルダのパスはクリップボードにコピー済みです。",
	)
}

func unzipBytes(data []byte, dest string) error {
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return err
	}

	destAbs, err := filepath.Abs(dest)
	if err != nil {
		return err
	}

	for _, file := range reader.File {
		name := filepath.Clean(file.Name)
		if name == "." || strings.HasPrefix(name, "..") {
			continue
		}
		target := filepath.Join(destAbs, name)
		if !strings.HasPrefix(target, destAbs+string(os.PathSeparator)) && target != destAbs {
			return fmt.Errorf("unsafe zip path: %s", file.Name)
		}

		if file.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0o755); err != nil {
				return err
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		if err := extractFile(file, target); err != nil {
			return err
		}
	}
	return nil
}

func extractFile(file *zip.File, target string) error {
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	out, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, src)
	return err
}

func copyClipboard(text string) error {
	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command",
		"Set-Clipboard -Value $env:CLIP_TEXT")
	cmd.Env = append(os.Environ(), "CLIP_TEXT="+text)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}

func openExplorer(path string) error {
	cmd := exec.Command("explorer.exe", path)
	return cmd.Start()
}

func openExtensionsPage() (string, bool) {
	type candidate struct {
		name string
		path string
		page string
	}
	localAppData := os.Getenv("LOCALAPPDATA")
	candidates := []candidate{
		{"Microsoft Edge", filepath.Join(os.Getenv("ProgramFiles(x86)"), "Microsoft", "Edge", "Application", "msedge.exe"), "edge://extensions"},
		{"Microsoft Edge", filepath.Join(os.Getenv("ProgramFiles"), "Microsoft", "Edge", "Application", "msedge.exe"), "edge://extensions"},
		{"Microsoft Edge", filepath.Join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe"), "edge://extensions"},
		{"Google Chrome", filepath.Join(os.Getenv("ProgramFiles"), "Google", "Chrome", "Application", "chrome.exe"), "chrome://extensions"},
		{"Google Chrome", filepath.Join(os.Getenv("ProgramFiles(x86)"), "Google", "Chrome", "Application", "chrome.exe"), "chrome://extensions"},
		{"Google Chrome", filepath.Join(localAppData, "Google", "Chrome", "Application", "chrome.exe"), "chrome://extensions"},
	}
	for _, item := range candidates {
		if item.path == "" {
			continue
		}
		if _, err := os.Stat(item.path); err != nil {
			continue
		}
		cmd := exec.Command(item.path, item.page)
		if err := cmd.Start(); err == nil {
			return item.name, true
		}
	}
	cmd := exec.Command("cmd", "/C", "start", "", "msedge", "edge://extensions")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if err := cmd.Start(); err == nil {
		return "Microsoft Edge", true
	}
	return "", false
}

func info(message string) {
	messageBox("CopilotSelecter", message)
}

func fail(message string) {
	messageBox("CopilotSelecter", message)
	os.Exit(1)
}

func messageBox(title, message string) {
	user32 := syscall.NewLazyDLL("user32.dll")
	proc := user32.NewProc("MessageBoxW")
	titlePtr, _ := syscall.UTF16PtrFromString(title)
	messagePtr, _ := syscall.UTF16PtrFromString(message)
	proc.Call(0, uintptr(unsafe.Pointer(messagePtr)), uintptr(unsafe.Pointer(titlePtr)), mbIconInformation)
}
