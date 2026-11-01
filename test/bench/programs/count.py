def count_vowels(word):
    count = 0
    for letter in word:
        if letter in "aeiou":
            count = count + 1

def countdown(n):
    while n > 0:
        print(n)
    print("Liftoff!")

print(count_vowels("programming"))
countdown(3)
