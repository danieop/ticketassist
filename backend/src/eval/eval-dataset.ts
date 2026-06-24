// ---------------------------------------------------------------------------
// Evaluation dataset – 15 cases for the CardSeller Java/JSP e-commerce repo
// ---------------------------------------------------------------------------

import type { EvalCase } from "./eval-config.js";

const MUST_NOT_CLAIM_DEFAULTS = [
  "fixed",
  "resolved",
  "deployed",
  "patched",
  "the code has been updated",
  "the fix has been applied",
  "this issue is now resolved",
];

export const evalDataset: EvalCase[] = [
  // ── EVAL-001 ─ Checkout total wrong after applying discount code ────────
  {
    id: "EVAL-001",
    category: "retrieval",
    difficulty: "medium",
    ticket: {
      title: "Checkout total wrong after applying discount code",
      description:
        "When a customer adds 3 identical cards to the cart and applies a valid 20% discount code, " +
        "the order summary still shows the original total without the discount. The discount code " +
        "is accepted (green checkmark appears) but the final price sent to VNPay does not reflect " +
        "the reduced amount. Reproduced on Chrome 125 with two different discount codes.",
      reporterName: "QA-Linh",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "high",
      acceptableAlternatives: ["critical"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/CheckOutController.java",
        "src/java/dal/cartDAO.java",
        "src/java/dal/discountDAO.java",
        "web/cart.jsp",
      ],
      shouldInclude: [
        "src/java/model/CartItem.java",
        "src/java/controller/Cart.java",
      ],
      mustNotInclude: [
        "src/java/controller/FeedBack.java",
        "src/java/controller/FAQs.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "discount calculation",
        "cart total",
        "checkout flow",
        "price mismatch",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Verify discountDAO returns the correct percentage and CheckOutController applies it before computing the total",
        "Check whether cart.jsp sends the discounted total or the raw total to the checkout endpoint",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "Checkout / Discount Application",
      suspectedFlow:
        "User applies discount → discountDAO.getDiscount() → CheckOutController calculates total " +
        "but may skip multiplying by discount factor → final amount forwarded to payment is un-discounted.",
    },
  },

  // ── EVAL-002 ─ Login fails with Google OAuth — redirect loop ────────────
  {
    id: "EVAL-002",
    category: "retrieval",
    difficulty: "easy",
    ticket: {
      title: "Login fails with Google OAuth — redirect loop",
      description:
        "Clicking 'Sign in with Google' on the login page redirects back to the login page " +
        "in an infinite loop. Browser shows 'too many redirects' after about 5 seconds. " +
        "Regular username/password login works fine. Started happening after the latest deployment.",
      reporterName: "CS-Hung",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "high",
      acceptableAlternatives: ["critical"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/LoginGoogle.java",
        "src/java/controller/Login.java",
        "src/java/dal/userDAO.java",
        "web/login.jsp",
      ],
      shouldInclude: [
        "src/java/model/UserGoogle.java",
      ],
      mustNotInclude: [
        "src/java/controller/SignUp.java",
        "src/java/controller/Cart.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "OAuth callback",
        "redirect URI",
        "session",
        "Google authentication",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Check LoginGoogle.java callback URL and session creation logic",
        "Verify the redirect URI matches the Google Cloud Console configuration",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "Google OAuth Login",
      suspectedFlow:
        "User clicks Google login → LoginGoogle servlet redirects to Google → Google callback " +
        "returns to LoginGoogle → session not set properly → Login filter redirects back to login.jsp.",
    },
  },

  // ── EVAL-003 ─ Payment via VNPay returns error code 99 ──────────────────
  {
    id: "EVAL-003",
    category: "retrieval",
    difficulty: "medium",
    ticket: {
      title: "Payment via VNPay returns error code 99",
      description:
        "Customers attempting to pay via VNPay are consistently receiving error code 99 " +
        "(\"Unknown error\") after being redirected back from the VNPay gateway. The order " +
        "is created in the system but marked as 'pending'. VNPay sandbox logs show the " +
        "secure hash validation is failing on the return URL. Affects all payment amounts.",
      reporterName: "QA-Mai",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "critical",
      acceptableAlternatives: ["high"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/Vnpay.java",
        "src/java/controller/CheckOutController.java",
        "web/vnpay_pay.jsp",
      ],
      shouldInclude: [
        "src/java/dal/transactionDAO.java",
        "src/java/model/Order.java",
      ],
      mustNotInclude: [
        "src/java/controller/ForgotPassword.java",
        "src/java/controller/FeedBack.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "VNPay",
        "secure hash",
        "return URL",
        "error code 99",
        "hash validation",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Verify Vnpay.java computes the HMAC-SHA512 hash using the correct secret key and parameter ordering",
        "Check that the return URL parameters are parsed and validated in the same order VNPay sends them",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "VNPay Payment Integration",
      suspectedFlow:
        "CheckOutController creates order → redirects to VNPay gateway → VNPay processes payment " +
        "→ callback to Vnpay servlet → secure hash comparison fails → error code 99 returned.",
    },
  },

  // ── EVAL-004 ─ Password reset email not received ────────────────────────
  {
    id: "EVAL-004",
    category: "retrieval",
    difficulty: "easy",
    ticket: {
      title: "Password reset email not received",
      description:
        "Users who click 'Forgot Password' and enter a valid registered email address never " +
        "receive the reset email. The page shows 'Email sent successfully' but nothing arrives " +
        "in the inbox or spam folder. Verified with 3 different email providers (Gmail, Outlook, " +
        "Yahoo). The SMTP server credentials may have expired.",
      reporterName: "Support-Tuan",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "high",
      acceptableAlternatives: ["medium"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/ForgotPassword.java",
        "src/java/dal/userDAO.java",
        "web/send-mail-noti.jsp",
        "web/forgot-password.jsp",
      ],
      shouldInclude: [
        "src/java/model/User.java",
      ],
      mustNotInclude: [
        "src/java/controller/Cart.java",
        "src/java/controller/Vnpay.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "SMTP",
        "email sending",
        "password reset",
        "mail configuration",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Check ForgotPassword servlet's SMTP configuration and credentials",
        "Verify the send-mail-noti.jsp template generates a valid email with correct recipient",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "Password Reset / Email Notification",
      suspectedFlow:
        "User submits email → ForgotPassword servlet looks up user in userDAO → generates reset " +
        "token → attempts to send email via SMTP → send-mail-noti.jsp renders template but SMTP " +
        "connection silently fails.",
    },
  },

  // ── EVAL-005 ─ Cart items disappear after page refresh ──────────────────
  {
    id: "EVAL-005",
    category: "retrieval",
    difficulty: "medium",
    ticket: {
      title: "Cart items disappear after page refresh",
      description:
        "After adding 2–3 cards to the shopping cart, refreshing the page (F5) causes all cart " +
        "items to disappear. The cart count in the header resets to 0. If the user navigates away " +
        "and comes back, items are also gone. This only happens for logged-in users; guest cart " +
        "stored in session seems to work. Database shows cart records exist but aren't loaded.",
      reporterName: "QA-Linh",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "high",
      acceptableAlternatives: ["critical"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/Cart.java",
        "src/java/dal/cartDAO.java",
        "web/cart.jsp",
        "src/java/model/CartItem.java",
      ],
      shouldInclude: [
        "src/java/dal/userDAO.java",
        "web/header.jsp",
      ],
      mustNotInclude: [
        "src/java/controller/Vnpay.java",
        "src/java/controller/FeedBack.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "session",
        "cart persistence",
        "database loading",
        "user authentication",
        "page reload",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Check if Cart.java loads cart items from cartDAO on GET requests for authenticated users",
        "Verify session attribute vs database cart synchronization in cartDAO",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "Shopping Cart Persistence",
      suspectedFlow:
        "User adds items → Cart servlet stores in session + cartDAO persists to DB → page refresh " +
        "→ Cart servlet doGet re-initializes session cart but fails to load from cartDAO for the " +
        "logged-in user → empty cart displayed.",
    },
  },

  // ── EVAL-006 ─ Admin cannot delete product with active orders ───────────
  {
    id: "EVAL-006",
    category: "retrieval",
    difficulty: "hard",
    ticket: {
      title: "Admin cannot delete product with active orders",
      description:
        "When an admin tries to delete a product that has been ordered by customers, the system " +
        "returns a generic 'Error deleting product' message with no details. The expected behavior " +
        "is either a soft-delete (marking as inactive) or a clear message explaining why deletion " +
        "is blocked. Currently the server returns HTTP 500 and the Tomcat log shows a foreign key " +
        "constraint violation on the OrderItem table.",
      reporterName: "Admin-Duc",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "medium",
      acceptableAlternatives: ["high"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/DeleteProduct.java",
        "src/java/controller/ManageProduct.java",
        "src/java/dal/OrderItemDAO.java",
        "web/manage-product.jsp",
      ],
      shouldInclude: [
        "src/java/model/OrderItem.java",
        "src/java/dal/cardDAO.java",
        "SellCard.sql",
      ],
      mustNotInclude: [
        "src/java/controller/Cart.java",
        "src/java/controller/ForgotPassword.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "foreign key constraint",
        "soft delete",
        "OrderItem dependency",
        "cascade",
        "product status",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Add a check in DeleteProduct for existing OrderItem references before attempting DELETE",
        "Implement soft-delete by adding an 'active' flag and filtering inactive products from the storefront",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "Admin Product Management / Deletion",
      suspectedFlow:
        "Admin clicks delete → DeleteProduct servlet calls cardDAO.delete(id) → SQL DELETE fails " +
        "due to FK constraint on OrderItem table → unhandled SQLException → HTTP 500.",
    },
  },

  // ── EVAL-007 ─ Signup verification code expires too quickly ─────────────
  {
    id: "EVAL-007",
    category: "retrieval",
    difficulty: "medium",
    ticket: {
      title: "Signup verification code expires too quickly",
      description:
        "Users report that the email verification code sent during signup expires before they " +
        "can enter it. The code seems to be valid for only about 30 seconds. Users with slower " +
        "email delivery (Yahoo, corporate mail) consistently fail to verify. Expected TTL should " +
        "be at least 5 minutes. The verify-signup page shows 'Code expired, please try again'.",
      reporterName: "Support-Tuan",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "medium",
      acceptableAlternatives: ["high"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/SignUp.java",
        "web/verify-signup.jsp",
        "src/java/dal/userDAO.java",
      ],
      shouldInclude: [
        "src/java/model/User.java",
        "web/send-mail-noti.jsp",
      ],
      mustNotInclude: [
        "src/java/controller/Login.java",
        "src/java/controller/Cart.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "verification code",
        "TTL",
        "expiration",
        "signup flow",
        "timestamp comparison",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Increase the verification code TTL constant in SignUp.java from 30 seconds to 5 minutes",
        "Check if the timestamp comparison uses seconds vs milliseconds incorrectly",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "User Registration / Email Verification",
      suspectedFlow:
        "User signs up → SignUp servlet generates code with timestamp → stores in session or DB " +
        "→ email sent → user enters code on verify-signup.jsp → timestamp comparison uses wrong " +
        "unit or hardcoded short TTL → code marked expired.",
    },
  },

  // ── EVAL-008 ─ Discount applied twice at checkout causing negative total
  {
    id: "EVAL-008",
    category: "end-to-end",
    difficulty: "hard",
    ticket: {
      title: "Discount applied twice at checkout causing negative total",
      description:
        "A customer discovered that clicking 'Apply Discount' twice in quick succession results " +
        "in the discount being deducted twice from the order total. For a 60% discount code on a " +
        "100,000 VND order, the total shows −20,000 VND. The payment still goes through to VNPay " +
        "with the negative amount, causing a transaction error. There is no duplicate-click guard " +
        "on the frontend and no server-side idempotency check.",
      reporterName: "QA-Mai",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "critical",
      acceptableAlternatives: ["high"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/CheckOutController.java",
        "src/java/dal/discountDAO.java",
        "src/java/controller/AddDiscount.java",
        "src/java/dal/cartDAO.java",
      ],
      shouldInclude: [
        "web/cart.jsp",
        "src/java/model/CardDetailDiscount.java",
        "src/java/controller/Vnpay.java",
      ],
      mustNotInclude: [
        "src/java/controller/ForgotPassword.java",
        "src/java/controller/SignUp.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "idempotency",
        "double-click",
        "discount deduction",
        "negative total",
        "race condition",
        "server-side validation",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Add server-side idempotency by tracking whether a discount has already been applied to the session/order",
        "Disable the apply button on the frontend after first click and validate on backend that discount was not already applied",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "Checkout / Discount Idempotency",
      suspectedFlow:
        "User clicks 'Apply Discount' twice → two concurrent requests hit AddDiscount/CheckOutController " +
        "→ both read the pre-discount total → both subtract the discount amount → total becomes " +
        "negative → VNPay receives invalid amount.",
    },
  },

  // ── EVAL-009 ─ Order history shows wrong transaction dates ──────────────
  {
    id: "EVAL-009",
    category: "retrieval",
    difficulty: "easy",
    ticket: {
      title: "Order history shows wrong transaction dates",
      description:
        "The purchase history page displays all transaction dates as '01/01/1970' regardless of " +
        "when the order was placed. The correct dates are stored in the database (verified via " +
        "SQL query). The issue appears to be in how dates are parsed or formatted on the frontend. " +
        "Affects all users viewing their order history.",
      reporterName: "CS-Hung",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "low",
      acceptableAlternatives: ["medium"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/BuyingHistory.java",
        "web/purchasehistory.jsp",
        "src/java/dal/transactionDAO.java",
        "src/java/model/TransHistory.java",
      ],
      shouldInclude: [
        "src/java/model/PurchaseHistory.java",
      ],
      mustNotInclude: [
        "src/java/controller/Vnpay.java",
        "src/java/controller/Cart.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "date parsing",
        "epoch",
        "timestamp format",
        "transaction date",
        "date display",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Check TransHistory model for date field type mismatch (String vs Date vs long)",
        "Verify transactionDAO maps the SQL DATETIME column correctly to the Java Date object",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "Purchase History / Date Display",
      suspectedFlow:
        "BuyingHistory servlet queries transactionDAO → TransHistory objects created with date " +
        "field defaulting to epoch (0) due to incorrect ResultSet column mapping → purchasehistory.jsp " +
        "formats the epoch date as 01/01/1970.",
    },
  },

  // ── EVAL-010 ─ Card price display shows 0 in admin management panel ─────
  {
    id: "EVAL-010",
    category: "retrieval",
    difficulty: "easy",
    ticket: {
      title: "Card price display shows 0 in admin management panel",
      description:
        "In the admin card price management page, all card prices are displayed as '0 VND' even " +
        "though the database contains correct price values. The issue started after a recent " +
        "change to the Card model. Adding or editing prices works correctly — the values are " +
        "saved to the database — but the list view always shows zero.",
      reporterName: "Admin-Duc",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "medium",
      acceptableAlternatives: ["low"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/ManageCardPrice.java",
        "web/manage-cardprice.jsp",
        "src/java/dal/cardDAO.java",
        "src/java/model/Card.java",
      ],
      shouldInclude: [
        "src/java/model/CardDetail.java",
        "src/java/controller/AddPrice.java",
      ],
      mustNotInclude: [
        "src/java/controller/Cart.java",
        "src/java/controller/FeedBack.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "price field",
        "getter method",
        "Card model",
        "ResultSet mapping",
        "display binding",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Check if the Card model's price getter was renamed or returns the wrong field after refactor",
        "Verify cardDAO.getAll() maps the price column to the correct Card field",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "Admin Card Price Management",
      suspectedFlow:
        "ManageCardPrice servlet calls cardDAO to list all cards → cardDAO builds Card objects " +
        "but price field not mapped (possibly renamed getter) → Card.getPrice() returns default 0 " +
        "→ manage-cardprice.jsp displays 0.",
    },
  },

  // ── EVAL-011 ─ SQL injection vulnerability in product search ────────────
  {
    id: "EVAL-011",
    category: "proposal",
    difficulty: "medium",
    ticket: {
      title: "SQL injection vulnerability in product search",
      description:
        "Security audit found that the admin product search endpoint is vulnerable to SQL injection. " +
        "Entering `' OR 1=1 --` in the search field returns all products instead of filtered " +
        "results. The search query appears to use string concatenation rather than parameterized " +
        "queries. This is a critical security vulnerability that could expose the entire database.",
      reporterName: "Security-Tam",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "critical",
      acceptableAlternatives: ["high"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/SearchManageProduct.java",
        "src/java/dal/cardDAO.java",
        "web/manage-product.jsp",
        "SellCard.sql",
      ],
      shouldInclude: [
        "src/java/dal/DBContext.java",
      ],
      mustNotInclude: [
        "src/java/controller/Cart.java",
        "src/java/controller/ForgotPassword.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "SQL injection",
        "PreparedStatement",
        "parameterized query",
        "input sanitization",
        "string concatenation",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Replace string concatenation with PreparedStatement and parameterized queries in cardDAO",
        "Add input validation in SearchManageProduct and use parameterized queries in the DAO layer",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "Admin Product Search / Security",
      suspectedFlow:
        "Admin enters search term → SearchManageProduct passes raw input to cardDAO.search() " +
        "→ cardDAO concatenates input directly into SQL string → attacker can inject arbitrary SQL.",
    },
  },

  // ── EVAL-012 ─ Server error 500 on large cart checkout (50+ items) ──────
  {
    id: "EVAL-012",
    category: "proposal",
    difficulty: "hard",
    ticket: {
      title: "Server error 500 on large cart checkout (50+ items)",
      description:
        "Users with more than 50 items in their cart receive an HTTP 500 error when attempting " +
        "to checkout. The Tomcat log shows an OutOfMemoryError in the checkout processing loop. " +
        "Smaller carts (under 30 items) work fine. The issue seems related to loading all card " +
        "details and generating individual order items in a single transaction without batching. " +
        "The cart page itself loads correctly — only the checkout action fails.",
      reporterName: "QA-Linh",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "high",
      acceptableAlternatives: ["critical"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/CheckOutController.java",
        "src/java/controller/Cart.java",
        "src/java/dal/cartDAO.java",
        "web/cart.jsp",
      ],
      shouldInclude: [
        "src/java/dal/OrderItemDAO.java",
        "src/java/model/CartItem.java",
        "src/java/model/Order.java",
      ],
      mustNotInclude: [
        "src/java/controller/FeedBack.java",
        "src/java/controller/FAQs.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "OutOfMemoryError",
        "batch processing",
        "cart size limit",
        "transaction batching",
        "performance",
        "scalability",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Process cart items in batches of 10-20 rather than loading everything into memory at once",
        "Add a cart item limit and implement pagination or chunked processing in CheckOutController",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "Checkout / Large Cart Handling",
      suspectedFlow:
        "User with 50+ items clicks checkout → CheckOutController loads all CartItems with full " +
        "CardDetail objects from cartDAO → creates all OrderItem objects in memory → " +
        "OutOfMemoryError before DB commit.",
    },
  },

  // ── EVAL-013 ─ Feedback submission silently fails for guest users ───────
  {
    id: "EVAL-013",
    category: "hallucination",
    difficulty: "medium",
    ticket: {
      title: "Feedback submission silently fails for guest users",
      description:
        "Guest users (not logged in) can fill out and submit the feedback form without any error " +
        "message, but the feedback never appears in the admin feedback management page. No " +
        "exception is logged on the server. For logged-in users, feedback submissions work " +
        "correctly. The form should either require login or support anonymous feedback with a " +
        "name/email field.",
      reporterName: "QA-Mai",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "medium",
      acceptableAlternatives: ["low"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/FeedBack.java",
        "src/java/dal/feedbackDAO.java",
        "web/manageFeedback.jsp",
      ],
      shouldInclude: [
        "src/java/model/FeedBack.java",
        "src/java/controller/ManageFeedback.java",
      ],
      mustNotInclude: [
        "src/java/controller/Cart.java",
        "src/java/controller/CheckOutController.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "guest user",
        "null user ID",
        "session check",
        "feedback persistence",
        "silent failure",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Add a null check for user session in FeedBack servlet and return an error or redirect to login",
        "Modify feedbackDAO.insert() to handle null userId or require authentication before submission",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "Feedback Submission / Guest Access",
      suspectedFlow:
        "Guest submits feedback → FeedBack servlet reads session user (null) → feedbackDAO.insert() " +
        "attempts INSERT with null userId → DB silently rejects (nullable FK) or DAO catches " +
        "exception without re-throwing → no feedback saved, no error shown.",
    },
  },

  // ── EVAL-014 ─ Profile image upload corrupts file on save ───────────────
  {
    id: "EVAL-014",
    category: "hallucination",
    difficulty: "medium",
    ticket: {
      title: "Profile image upload corrupts file on save",
      description:
        "When a user uploads a profile picture (JPG or PNG, under 2 MB), the saved image appears " +
        "corrupted — it either shows as a gray square or doesn't render at all. Downloading the " +
        "saved file and inspecting it shows the file size is different from the original. Suspect " +
        "the multipart form handling is truncating the binary stream or applying text encoding to " +
        "binary data. Only affects image uploads; other profile fields save correctly.",
      reporterName: "QA-Linh",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "medium",
      acceptableAlternatives: ["high"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/PersonalInfo.java",
        "web/profile.jsp",
        "src/java/dal/userDAO.java",
      ],
      shouldInclude: [
        "src/java/model/User.java",
      ],
      mustNotInclude: [
        "src/java/controller/Cart.java",
        "src/java/controller/Vnpay.java",
        "src/java/controller/FeedBack.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "multipart upload",
        "binary stream",
        "file corruption",
        "encoding",
        "image processing",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Check PersonalInfo servlet's multipart handling for correct binary stream reading",
        "Verify the file is written using a binary OutputStream rather than a character Writer",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "User Profile / Image Upload",
      suspectedFlow:
        "User uploads image via profile.jsp → PersonalInfo servlet reads the Part input stream " +
        "→ writes to disk using incorrect encoding (e.g., InputStreamReader instead of raw " +
        "InputStream) → binary data gets character-encoded → corrupted file saved.",
    },
  },

  // ── EVAL-015 ─ Order processing queue not following FIFO order ──────────
  {
    id: "EVAL-015",
    category: "end-to-end",
    difficulty: "hard",
    ticket: {
      title: "Order processing queue not following FIFO order",
      description:
        "The admin order queue management page shows orders being processed out of sequence. " +
        "Orders placed later are being fulfilled before earlier ones. For example, order #1050 " +
        "(placed at 10:00 AM) is still 'pending' while order #1055 (placed at 10:15 AM) is " +
        "already 'shipped'. The queue startup initialization may be loading orders in wrong " +
        "sort order, or new orders are inserted at the wrong position in the processing queue.",
      reporterName: "Admin-Duc",
      source: "MANUAL",
    },
    expectedPriority: {
      level: "high",
      acceptableAlternatives: ["critical"],
    },
    expectedRelevantFiles: {
      mustInclude: [
        "src/java/controller/ManageOrderQueue.java",
        "src/java/controller/QueueStartUp.java",
        "src/java/dal/OrderItemDAO.java",
        "web/orderItem.jsp",
      ],
      shouldInclude: [
        "src/java/model/OrderItem.java",
        "src/java/model/Order.java",
        "src/java/controller/AddTransaction.java",
      ],
      mustNotInclude: [
        "src/java/controller/Cart.java",
        "src/java/controller/FeedBack.java",
      ],
    },
    expectedProposal: {
      mustMentionConcepts: [
        "FIFO",
        "queue ordering",
        "sort order",
        "order processing",
        "timestamp sorting",
        "queue initialization",
      ],
      mustNotClaim: MUST_NOT_CLAIM_DEFAULTS,
      acceptableApproaches: [
        "Fix the SQL ORDER BY clause in OrderItemDAO to sort by creation timestamp ASC",
        "Ensure QueueStartUp initializes the in-memory queue in chronological order and new orders are enqueued at the tail",
      ],
    },
    goldenAnalysis: {
      affectedFeature: "Admin Order Queue Management",
      suspectedFlow:
        "Server starts → QueueStartUp loads pending orders from OrderItemDAO without ORDER BY " +
        "created_at → queue populated in arbitrary DB row order → ManageOrderQueue processes " +
        "orders in wrong sequence → later orders fulfilled before earlier ones.",
    },
  },
];
