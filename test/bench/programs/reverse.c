#include <stdio.h>
#include <string.h>

void reverse(char *s)
{
    int i = 0, j = (int)strlen(s) - 1;
    while (i < j) {
        char t = s[i];
        s[i] = s[j];
        s[j] = t;
        i++;
        j--;
    }
}

int main(void)
{
    char word[] = "debugging";
    reverse(word);
    printf("%s\n", word);
    return 0;
}
