# Test catalog — 62 cases

Parameterized rows (`it.each`) are counted separately because each row runs as an independent case.

## 1. Unit: UI components and PDF validation — 18 cases

**`unit/components.test.tsx`**

1. ScoreBadge: score 95 displays `Strong`.
2. ScoreBadge: score 71 displays `Strong`.
3. ScoreBadge: score 60 displays `Good Start`.
4. ScoreBadge: score 50 displays `Good Start`.
5. ScoreBadge: score 49 displays `Needs Work`.
6. ScoreBadge: score 0 displays `Needs Work`.
7. ATS card: score 85 displays `Great Job!` and the score.
8. ATS card: score 60 displays `Good Start` and the score.
9. ATS card: score 20 displays `Needs Improvement` and the score.
10. ATS card: each suggestion renders with the expected check/warning icon.
11. ATS card: green/yellow/red gradient follows the score tier.
12. Summary: overall score and all four category rows render.
13. Details: four accordion sections render and a new section closes the previously open section.
14. Details: score badges use green/yellow/red classes for the respective score ranges.
15. ScoreCircle: SVG stroke offset is proportional to the score and the text shows the score.
16. FileUploader: a PDF is accepted.
17. FileUploader: DOCX and PNG files are rejected.
18. FileUploader: a PDF over 20 MB is rejected while a PDF exactly 20 MB is accepted.

## 2. Unit: Puter.js store — 8 cases

**`unit/puter-store.test.ts`**

19. Missing Puter.js reports an error for auth, KV, and AI service paths.
20. `checkAuthStatus` records an authenticated user.
21. `checkAuthStatus` records an unauthenticated state.
22. Thrown authentication errors are surfaced in `store.error`.
23. `signIn` and `signOut` flip the authentication state.
24. `ai.feedback` sends the PDF path and prompt as a file-plus-text message.
25. `kv.list` defaults `returnValues` to `false`.
26. `init()` reports failure when Puter.js has not loaded after 10 seconds.

## 3. Unit: utilities and prompt construction — 6 cases

**`unit/utils-and-prompts.test.ts`**

27. `formatSize` handles zero, KB, MB, and 20 MB.
28. `cn` merges conflicting Tailwind classes and ignores falsey class values.
29. `generateUUID` produces 1,000 unique UUID-shaped IDs.
30. AI instructions include the supplied job title and job description.
31. AI instructions embed the response schema and demand JSON-only output.
32. The response schema includes the overall score and all five scored categories.

## 4. Integration: end-to-end app workflows — 11 cases

**`integration/resume-workflow.test.tsx`**

33. Successful upload runs the expected steps and persists final feedback in KV storage.
34. Job title and job description are passed into the AI prompt.
35. Submitting without a selected file does not start an upload.
36. PDF upload failure shows an error and stops before the AI call.
37. PDF-to-image conversion failure is reported.
38. An empty AI response displays `Failed to analyze resume`.
39. AI content returned as an array of blocks is handled.
40. Home lists stored resumes and their scores.
41. Home displays the empty-state call to action when no resumes are stored.
42. Resume detail renders Summary, ATS, and Details from saved feedback.
43. An unauthenticated user is redirected to `/auth`.

## 5. Regression: known defect fixes and error/state handling — 19 cases

**`regression/defect-regressions.test.tsx`**

44. `getScoreTier(100)` returns `good`.
45. `getScoreTier(70)` returns `good`.
46. `getScoreTier(69)` returns `ok`.
47. `getScoreTier(50)` returns `ok`.
48. `getScoreTier(49)` returns `poor`.
49. `getScoreTier(0)` returns `poor`.
50. At score 70, Summary badge, ATS card, and Details badge agree.
51. At score 69, Summary badge, ATS card, and Details badge agree.
52. At score 50, Summary badge, ATS card, and Details badge agree.
53. At score 49, Summary badge, ATS card, and Details badge agree.
54. Summary category-number colors use the same score cutoffs.
55. Invalid/non-JSON AI output shows a visible error, avoids an unhandled rejection, and leaves the form usable.
56. A thrown AI error is shown to the user.
57. JSON wrapped in a Markdown `json` fence is accepted.
58. Missing required fields and absent JSON are rejected; valid feedback JSON parses.
59. Upload failure preserves the form values/file and allows a retry to succeed.
60. The form is hidden while analysis remains in progress.
61. A record with empty feedback shows `Analysis pending`, not a fabricated score.
62. ScoreCircle does not show the default score when no score is provided.

## Count check

| Category                              |  Cases |
| ------------------------------------- | -----: |
| UI components / PDF validation        |     18 |
| Puter.js store                        |      8 |
| Utilities / prompts                   |      6 |
| Integration workflows                 |     11 |
| Regression / error and state handling |     19 |
| **Total**                             | **62** |
