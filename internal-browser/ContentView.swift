import SwiftUI
import WebKit
import Combine

struct ContentView: View {
    @StateObject private var browser = BrowserModel()
    @State private var address = "https://www.google.com"
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button { browser.webView.goBack() } label: { Image(systemName: "chevron.left") }
                    .disabled(!browser.canGoBack)
                Button { browser.webView.goForward() } label: { Image(systemName: "chevron.right") }
                    .disabled(!browser.canGoForward)
                TextField("Search Google or enter a website", text: $address)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit { browser.open(address) }
                Button("Go") { browser.open(address) }
                Button { browser.webView.reload() } label: { Image(systemName: "arrow.clockwise") }
                Button { browser.open("https://www.google.com") } label: { Image(systemName: "house") }
            }.padding(10)
            if browser.loading { ProgressView().padding(4) }
            if let error = browser.errorMessage {
                Text(error).font(.caption).foregroundColor(.red).padding(8)
            }
            BrowserWebView(webView: browser.webView)
        }
        .onReceive(browser.$currentURL) { address = $0 }
    }
}

@MainActor
final class BrowserModel: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate {
    let webView = WKWebView()
    @Published var canGoBack = false
    @Published var canGoForward = false
    @Published var loading = false
    @Published var currentURL = "https://www.google.com"
    @Published var errorMessage: String?
    private var observations: [NSKeyValueObservation] = []

    override init() {
        super.init()
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        observations = [
            webView.observe(\.isLoading, options: [.new]) { [weak self] _, _ in
                Task { @MainActor in self?.refresh() }
            },
            webView.observe(\.url, options: [.new]) { [weak self] _, _ in
                Task { @MainActor in self?.refresh() }
            },
            webView.observe(\.canGoBack, options: [.new]) { [weak self] _, _ in
                Task { @MainActor in self?.refresh() }
            },
            webView.observe(\.canGoForward, options: [.new]) { [weak self] _, _ in
                Task { @MainActor in self?.refresh() }
            }
        ]
        open("https://www.google.com")
    }
    private func refresh() {
        loading = webView.isLoading
        canGoBack = webView.canGoBack
        canGoForward = webView.canGoForward
        if let url = webView.url { currentURL = url.absoluteString }
    }
    func open(_ input: String) {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        errorMessage = nil
        let url: URL?
        if let explicit = URL(string: text),
           ["http", "https"].contains(explicit.scheme?.lowercased() ?? ""), explicit.host != nil {
            url = explicit
        } else if !text.contains(where: { $0.isWhitespace }), !text.contains("://"),
                  let candidate = URL(string: "https://" + text),
                  let host = candidate.host, host.contains("."),
                  !host.hasPrefix("."), !host.hasSuffix(".") {
            url = candidate
        } else {
            var search = URLComponents(string: "https://www.google.com/search")!
            search.queryItems = [URLQueryItem(name: "q", value: text)]
            url = search.url
        }
        if let url { webView.load(URLRequest(url: url)) }
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let allowed = ["http", "https", "about", "blob", "data"].contains(navigationAction.request.url?.scheme?.lowercased() ?? "")
        if !allowed { errorMessage = "This link requires an external app and cannot open here." }
        decisionHandler(allowed ? .allow : .cancel)
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if navigationAction.targetFrame == nil { webView.load(navigationAction.request) }
        return nil
    }
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        errorMessage = nil
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { errorMessage = error.localizedDescription }
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { errorMessage = error.localizedDescription }
    }
}

#if os(macOS)
struct BrowserWebView: NSViewRepresentable {
    let webView: WKWebView
    func makeNSView(context: Context) -> WKWebView { webView }
    func updateNSView(_ nsView: WKWebView, context: Context) {}
}
#else
struct BrowserWebView: UIViewRepresentable {
    let webView: WKWebView
    func makeUIView(context: Context) -> WKWebView { webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
#endif
