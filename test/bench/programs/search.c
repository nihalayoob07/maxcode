#include <stdio.h>

int find(const int *a, int n, int want)
{
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (a[mid] == want) return mid;
        if (a[mid] < want) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

int main(void)
{
    int a[] = {2, 5, 8, 13, 21};
    printf("%d\n", find(a, 5, 13));
    return 0;
}
