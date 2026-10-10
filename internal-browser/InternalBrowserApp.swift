import SwiftUI

@main
struct InternalBrowserApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .frame(minWidth: 640, minHeight: 480)
        }
        .defaultSize(width: 1100, height: 760)
    }
}
