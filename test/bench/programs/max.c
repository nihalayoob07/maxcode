#include <stdio.h>

int largest(int arr[], int n)
{
    int best = arr[0];
    for (int i = 1; i < n; i++) {
        if (arr[i] > best) {
            best = arr[i];
        }
    }
    return best;
}

int main()
{
    int nums[] = {4, 17, 9, 23, 8};
    printf("Largest: %d\n", largest(nums, 5));
    return 0;
}
