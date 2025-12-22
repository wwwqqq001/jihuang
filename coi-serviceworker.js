/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("message", (ev) => {
        if (!ev.data) {
            return;
        } else if (ev.data.type === "deregister") {
            self.registration.unregister();
        } else if (ev.data.type === "coepCredentialless") {
            coepCredentialless = ev.data.value;
        }
    });

    self.addEventListener("fetch", function (event) {
        const r = event.request;
        if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
            return;
        }

        const request = (coepCredentialless && r.mode === "no-cors")
            ? new Request(r, {
                credentials: "omit",
            })
            : r;
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.status === 0) {
                        return response;
                    }

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Embedder-Policy",
                        coepCredentialless ? "credentialless" : "require-corp");
                    if (!newHeaders.get("Cross-Origin-Opener-Policy")) newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
                .catch((e) => console.error(e))
        );
    });
} else {
    (() => {
        const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
        window.sessionStorage.removeItem("coiReloadedBySelf");
        const coepCredentialless = false;

        if (reloadedBySelf) {
            console.log("coi-serviceworker: Reloaded by self.");
            return;
        }

        if (window.crossOriginIsolated) {
            console.log("coi-serviceworker: Environment is already cross-origin isolated.");
            return;
        }

        if (!window.isSecureContext) {
            console.log("coi-serviceworker: Environment is not secure (HTTPS or localhost).");
            return;
        }

        const src = document.currentScript.src;
        const script = document.createElement("script");
        script.src = src; 
        // Prevent infinite loop if the script is loaded differently
        if(src === window.location.href) return;

        navigator.serviceWorker.register(src).then(
            (registration) => {
                console.log("coi-serviceworker: Registered.");
                registration.active?.postMessage({
                    type: "coepCredentialless",
                    value: coepCredentialless,
                });

                window.sessionStorage.setItem("coiReloadedBySelf", "true");
                window.location.reload();
            },
            (err) => {
                console.error("coi-serviceworker: Registration failed: ", err);
            }
        );
    })();
}