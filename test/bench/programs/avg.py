def average(nums):
    total = 0
    for i in range(len(nums) + 1):
        total += nums[i]
    return total / len(nums)

scores = [72, 85, 90, 66]
result = average(scores)
print("Average score: " + result)
