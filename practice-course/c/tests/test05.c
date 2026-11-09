#include <string.h>
#include "check.h"
#include "ex05.h"

int main(void)
{
    CHECK(my_strlen("") == 0);
    CHECK(my_strlen("hello") == 5);

    char shout[] = "Hello, World 1!";
    to_upper(shout);
    CHECK(strcmp(shout, "HELLO, WORLD 1!") == 0);

    CHECK(count_char("banana", 'a') == 3);
    CHECK(count_char("banana", 'z') == 0);
    CHECK(is_palindrome("racecar") == 1);
    CHECK(is_palindrome("abba") == 1);
    CHECK(is_palindrome("abca") == 0);
    CHECK(is_palindrome("") == 1);

    char small[4] = "xyz";
    safe_copy(small, sizeof small, "Hello");
    CHECK(strcmp(small, "Hel") == 0);
    char big[16] = "";
    safe_copy(big, sizeof big, "Hi");
    CHECK(strcmp(big, "Hi") == 0);
    return check_summary();
}
