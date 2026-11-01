#include <stdio.h>

void swap(int a, int b)
{
    int t = a;
    a = b;
    b = t;
}

int main()
{
    int x, y;
    printf("Enter two numbers: ");
    scanf("%d %d", x, y);
    swap(x, y);
    printf("x = %d, y = %d\n", x, y);
    return 0;
}
