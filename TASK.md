

## TODO list (written by the user):

[x] Sometime displaying the mail content will affect the UI of the whole website. I think you need to somehow "sanitize" or isolate the mail content dispaly. (Fixed: mail HTML now renders in a sandboxed iframe with srcdoc)
[x] The draft should "auto save" without a "save draft button". The stragety is like "every 3 seconds (or UI forcus changed?), if user has made a change since last save, then save the changes". If the modification is saved, show (a icon or text?) to user that it is saved (saving -> saved). Becore user close the draft pannel, it should also be saved (if there is change). (Fixed: 3s auto-save, blur/visibility-change save, saving->saved indicator, save-on-close)
[x] Attachment: user should be able to download the mail attachment. If the attachment is encrypted, the frontend should fetch the content fisrt, decrypt and trigger download. You can refer to the old repo for this process. (Already implemented in mail-detail.tsx)
[x] UI: Now when I hover an email, the select box jumps out. It is not nice, because the position of the mail subject is changed suddenly. You can find a better way for this. (Fixed: checkbox/star share a fixed-width container, using opacity transitions instead of display toggling)

[x] Failed to download the attachment: about:srcdoc:1 Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set. (Fixed: sandbox now uses allow-scripts+allow-downloads without allow-same-origin for security; resize uses postMessage)
[x] Now the checkbox will overlap star. In this case I cannot star an email. Consider just put the checkbox to the left of the start icon. (Fixed: checkbox and star are now separate side-by-side elements)

[x] Add filter in the mail list. So that user can filter Unread/Read/Encrypted/Star/Mail (Fixed: filter dropdown in mail list header with quick filters for All Mail, Unread, Read, Starred, Encrypted)
[x] Auto refresh the mail list to possible new mail (Fixed: 30s polling interval in mail-list.tsx refreshes mails and stats)
[x] Show user's space used. You can refer to the old repo on how to do that. (Fixed: GET /users/profile API, progress bar in sidebar showing "X of Y" storage)


[x] There should be a place/notification to show the mail sending status. (sending -> mail sent) (Fixed: sonner toast — "Mail sent" on success, "Send failed" with error on failure)
[x] When I click logout, it will return to the landing page. However, it will immediately require me to sign message to sign in. (Fixed: logout now disconnects wallet before clearing auth, preventing auto-login loop)
[x] When I first login and the wallet is not connected and I try to compose an new email, the draft cannot be saved. I guess it's because you don't have the encryption key right? We can add the logic as: "When user click the compose and it has no encryption key, then go to the connect/sign and get encryption key process?" (Fixed: wallet stays connected after login; compose shows connect-wallet banner if wallet disconnects)

## UX Optimization TODO:

### A) Polish pass — loading skeletons, transitions, hover states, consistent spacing
[ ] Add loading skeletons for mail list and mail detail
[ ] Add transitions for hover states and batch toolbar appear/disappear
[ ] Standardize padding (sidebar px-3, mail list px-4, detail p-6 — pick one pattern)
[ ] Standardize icon sizes across similar contexts (h-3 w-3 vs h-3.5 w-3.5 vs h-4 w-4)
[ ] Improve empty states with illustrations or guidance text

### A.1)
[x] In the mail view, add a `x` icon (the same functionity with `back`) in the top right tools (right besides the `spam` icon). (Fixed: X close button added at end of detail toolbar)
[x] The tools in the mail view is calling incorrect api. When I click these tools, it always fail: {"error":{"code":406,"message":"err format of 0 th mail"}} (Fixed: updateMailStatus now base64-encodes message_id to match backend format)
[x] Add some transitions when new content come out. Now the new mail/details just come out suddenly. Make it nicer. (Fixed: fade-in animations on mail list and mail detail using tailwindcss-animate)


### B) Readability — stronger unread indicators, better visual hierarchy in mail list
[x] Stronger unread mail indicator (Fixed: blue left border on unread items, bold sender/subject/date in text-foreground vs muted for read)
[x] Better visual differentiation between mail list items (Fixed: unread items have left border + bold text + foreground color; read items use muted text throughout)
[x] Consistent timestamp/metadata sizing (Fixed: all timestamps use text-xs consistently, no text-[11px] usage)

### C) Dark mode fixes — hardcoded colors, contrast issues
[x] Fix amber warning banner in compose (Fixed: added dark: variants — bg-amber-950/40, border-amber-800, text-amber-400/200)
[x] Audit all hardcoded color values for dark mode compatibility (Fixed: encrypted badge green-700/300 → dark:green-400/700, lock icon green-600 → dark:green-400. Star yellow-400 and unread blue-500 work in both modes)

### D) Accessibility — aria-labels, focus states, keyboard shortcuts
[x] Add aria-labels to icon-only buttons (Fixed: aria-label on all icon-only buttons in mail-detail, mail-list, mail-list-item, compose-mail)
[x] Add focus-visible rings on interactive elements for keyboard nav (Fixed: Button/Checkbox already have focus-visible rings; star button in mail-list-item got explicit focus-visible:ring-1)
[ ] Add keyboard shortcuts for common actions (compose, reply, delete) (Removed: too error-prone)
[x] Announce checkbox selection to screen readers (Fixed: aria-live="polite" on selection count in mail-list batch toolbar)

Minor issues:

[x] When I refresh the whole webpage in the /mailbox, it flash landing page very quickly and the going back to mailbox. Fix this. (Fixed: added hydrated gate — pages wait for loadFromStorage before redirecting, preventing flash)
[x] Add a refresh button of the mail list. (Fixed: RefreshCw button in mail list header with spin animation while refreshing)

