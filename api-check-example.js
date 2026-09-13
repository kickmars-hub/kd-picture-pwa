// OPTIONAL SERVER-SIDE EXAMPLE / PSEUDOCODE
// Deploy this logic as /api/check on your hosting platform.
// Keep your AI API key ONLY on the server, never in app.js.
// Expected request JSON:
// { pictureNumber, studentAnswer, expectedAnswers }
// Expected response JSON:
// { correct: true|false, feedback: "...", suggestedAnswer: "..." }
//
// The AI should be instructed to judge whether the student's sentence
// accurately describes the same meaning as one of expectedAnswers,
// while allowing harmless differences such as articles or natural synonyms,
// but rejecting grammar/meaning errors that matter for the lesson.
