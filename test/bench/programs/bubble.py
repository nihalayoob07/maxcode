def bubble_sort(items):
    items = list(items)
    n = len(items)
    for i in range(n):
        for j in range(n - 1 - i):
            if items[j] > items[j + 1]:
                items[j], items[j + 1] = items[j + 1], items[j]
    return items

print(bubble_sort([5, 2, 9, 1]))
