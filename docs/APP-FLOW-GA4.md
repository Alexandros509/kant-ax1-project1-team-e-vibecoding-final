# Mobile app-flow simulation

Open /app-preview on the same host/port as the site (for example http://localhost:3000/app-preview if that is the configured origin). It shows only the responsive app screen in a maximum 430px frame, without the surrounding phone/debug panel. This is a browser simulation, not an APK, emulator or deployed native app.

The mobile main page uses the selected lookbook layout: JACKET and PANTS + markers open their respective product detail pages; VIEW OUTFIT opens the product sheet. The public release links to the same fictional catalog used by its list/detail pages and uses an original illustration instead of the private campaign video. Bottom navigation connects Home, Shop, Bag and Account. Size selection, gallery, wishlist, cart and checkout remain part of the flow.

Kakao login opens at top level and returns to the preview. Checkout also moves to top level before payment, preserving a narrow app layout and return navigation. Screen parameters are allowlisted; arbitrary external destinations are not accepted.

UI actions have controlled data-track-action identifiers. With valid test-property configuration and consent, they can queue ui_click events with execution_surface=app_preview and flow_id=onepiece_app_flow_v1. Native user-agent detection labels android_webview separately; it does not prove an APK was built. Review query mode ?preview=A/B is different from /app-preview and suppresses measurement/payment.

No GA4 account, property, audience, conversion or experiment setting was changed as part of this source update. The team must validate actual reception, event definitions, exposure/assignment and test conditions. Simulated clicks are not evidence of usability outcomes from real participants. The public fixture differs from the private reference catalog, so do not compare them as UI-only experimental conditions.
