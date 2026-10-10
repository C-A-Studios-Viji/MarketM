# Internal Google Browser for Mac

A native SwiftUI browser that opens Google searches and websites inside its own WKWebView, without launching Safari or your default browser.

## Run in Xcode

1. Download or clone this repository.
2. Open `internal-browser/InternalBrowser.xcodeproj` in Xcode.
3. Select the **InternalBrowser** scheme and **My Mac** destination.
4. Press **Command-R**.

Requires macOS 13 or later and Xcode with the macOS SDK. No packages, Google API key, or paid developer account are needed for a local build. The project uses local signing and enables outgoing network connections in its sandbox entitlements.

## Browse

Type search words and press Return or Go to search Google inside the app. Enter a domain such as `apple.com` to open a website. The toolbar includes back, forward, reload, and Google home. Links requesting a new window open in the same view. Links requiring an external app are blocked.

This is a native Mac application. GitHub Pages cannot run it; open the project in Xcode to build and run it. The repository's existing MarketM game remains separate.

## Build from Terminal

```sh
xcodebuild -project internal-browser/InternalBrowser.xcodeproj \
  -scheme InternalBrowser -configuration Debug \
  -derivedDataPath "$HOME/Library/Developer/Xcode/DerivedData/InternalBrowserLocal" build
```

The app is produced at `~/Library/Developer/Xcode/DerivedData/InternalBrowserLocal/Build/Products/Debug/InternalBrowser.app`.

## Validation and limitations

Built and signed successfully with Xcode 27.0 on Apple Silicon. The app was launched locally; interactive Google searches have not been verified automatically. Google sign-in and some websites may restrict embedded browsers. Downloads, additional tabs, JavaScript alert/prompt dialogs, and external-app links are not implemented. Standard transport security settings may block HTTP-only sites.
