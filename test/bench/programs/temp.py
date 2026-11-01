def to_fahrenheit(c):
    return c * 9 / 5 + 32

temps = [0, 25, 100]
for t in temps:
    print(t, "C is", to_fahrenheit(t), "F")
