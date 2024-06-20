function roomUsersScore(args) {
  const {
    id,
    username,
    score,
    isOnline,
    userId,
    answerState,
    lastQuestionScore = 0,
    isMe = false,
  } = args;

  if (username === undefined) {
    throw new Error("The argument 'username' is required.");
  }
  if (typeof username !== "string") {
    throw new Error("The argument 'username' must be a string.");
  }

  if (score === undefined) {
    throw new Error("The argument 'score' is required.");
  }
  if (typeof score !== "number") {
    throw new Error("The argument 'score' must be a number.");
  }

  if (isOnline === undefined) {
    throw new Error("The argument 'isOnline' is required.");
  }
  if (typeof isOnline !== "boolean") {
    throw new Error("The argument 'isOnline' must be a boolean.");
  }

  if (userId === undefined) {
    throw new Error("The argument 'userId' is required.");
  }
  if (typeof userId !== "string") {
    throw new Error("The argument 'userId' must be a string.");
  }

  if (answerState === undefined) {
    throw new Error("The argument 'answerState' is required.");
  }
  if (
    !["notAnswered", "correctlyAnswered", "incorrectlyAnswered"].includes(
      answerState
    )
  ) {
    throw new Error(
      'The argument answerState must be one of "notAnswered", "correctlyAnswered", or "incorrectlyAnswered".'
    );
  }

  if (lastQuestionScore === undefined) {
    throw new Error("The argument 'lastQuestionScore' is required.");
  }
  if (typeof lastQuestionScore !== "number") {
    throw new Error("The argument 'lastQuestionScore' must be a number.");
  }

  if (id === undefined) {
    throw new Error("The argument 'id' is required.");
  }
  if (typeof id !== "string") {
    throw new Error("The argument 'id' must be a string.");
  }
  console.log("lastQuestionScore", lastQuestionScore);

  return {
    username,
    score,
    isOnline,
    userId,
    answerState,
    id,
    lastQuestionScore,
    isMe,
  };
}

module.exports = roomUsersScore;
