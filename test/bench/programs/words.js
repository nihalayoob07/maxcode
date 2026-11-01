function longestWord(sentence) {
  const words = sentence.split(" ");
  let longest = "";
  for (const word of words) {
    if (word.length > longest.length) {
      longest = word;
    }
  }
  return longest;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

console.log(capitalize(longestWord("the quick brown fox jumped")));
