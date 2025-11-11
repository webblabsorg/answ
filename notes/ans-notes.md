Admin Dashboard
APIs
Backend setup - Railway



are phases 1 and 2 thoroughly done? Are they approriately linked to the homepage and dashboard? Each of the menu items in
   the sidebar  when clicked should open it's page in the center of the page? Is that done?

1. Add Library and Projects under Tools. These are two different menu items. Sure to add icons in front of each and down arrow to open it and show it's sub menu items. Library will integrated educational apps the user can add to dashboard. You can suggest some of these apps. The Projects will be homeworks, essays, thesis, project works, etc. Reduce the font size to H5 for all the content in the sidebar

2.  Move the Chat menu item under Projects. Add Recent chats to show history of chats. Reduce the font size of all the menu items and content in the sidebar to H5. Let's have 4 recent chats.

3.The 'recent chats'  should have a scrollable feature to scroll downward and first previous chats. There should be three
   horizontal dots, when clicked open a small modal popup menu box with the option to Share, Rename, Archive, and Delete.
   Each of these options should have an icon in front of it and the 'Delete' text option should be in red color.

3.   Update the github with the updates.

Please keep all doc files in the notes/ folder.

------

verify and validate the outcome below. Ensure All the features implemented are production-ready and fully functional on the homepage, dashboard, etc. No demos and simulations. Identify any mismatches, issues, etc if any.

---------

review phase4-spec-parity in the notes\phases\addenda\ folder and implement it

----------

Optional next steps (say the word and I’ll implement)
•  Wire PricingModal to call backend GET /subscriptions/pricing/:currency instead of local rates; and pass country/currency to POST /subscriptions/checkout to trigger PayPal routing from the UI.
•  Add Stripe Tax (jurisdiction detection and VAT/GST lines), and show VAT ID fields on org accounts.
•  Dunning: retry schedule + email reminders for failed invoices.
•  Regional providers: Razorpay/Mercado Pago/Alipay adapters behind feature flags.
•  Admin revenue dashboard (MRR/ARR/churn/LTV/CAC) and CSV/PDF exports for tax summaries.