def sum_to(n):
    total = 0
    for i in range(1, n):
        total += i
    return total

print("1 + 2 + ... + 10 =", sum_to(10))
