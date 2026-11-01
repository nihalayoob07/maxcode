text = "the quick brown fox jumps over the lazy dog the end"
counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1

top = max(counts, key=counts.get)
print(top, counts[top])
