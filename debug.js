const content = `<%
        const obj = {
          name: "test",
          value: 123
        };
      %>`;

console.log("Content:");
console.log(content);
console.log("\nLines:");
content.split("\n").forEach((line, i) => console.log(`${i}: ${line}`));

// Test the regex patterns
const patterns = [
  {
    regex: /<%-\s*((?:(?!%>)[\s\S])*?)\s*%>/g,
    tagType: "unescaped",
  },
  {
    regex: /<%=\s*((?:(?!%>)[\s\S])*?)\s*%>/g,
    tagType: "output",
  },
  {
    regex: /<%(?![-=])\s*((?:(?!%>)[\s\S])*?)\s*%>/g,
    tagType: "scriptlet",
  },
];

console.log("\nMatches:");
for (const pattern of patterns) {
  let match;
  pattern.regex.lastIndex = 0;

  while ((match = pattern.regex.exec(content)) !== null) {
    const jsCode = match[1].trim();
    console.log(`${pattern.tagType}: "${jsCode}"`);
    console.log(`Lines in JS code: ${jsCode.split("\n").length}`);

    // Calculate position information
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;

    // Find line and character positions
    const startPos = getLineAndCharacter(content, startIndex);
    const endPos = getLineAndCharacter(content, endIndex);

    // Calculate the actual JavaScript content position within the tag
    const jsStartIndex = startIndex + match[0].indexOf(jsCode);
    const jsStartPos = getLineAndCharacter(content, jsStartIndex);

    console.log(
      `JS Start: line ${jsStartPos.line}, char ${jsStartPos.character}`
    );
    console.log(
      `JS End: line ${jsStartPos.line + (jsCode.split("\n").length - 1)}`
    );
  }
}

function getLineAndCharacter(content, index) {
  const beforeIndex = content.substring(0, index);
  const lines = beforeIndex.split("\n");
  return {
    line: lines.length - 1,
    character: lines[lines.length - 1].length,
  };
}
