#include <string.h>
#include "check.h"
#include "ex10.h"

int main(void)
{
    Scoreboard board;
    board.count = 99; /* garbage, so we can see board_init reset it */
    board_init(&board);
    CHECK(board.count == 0);
    CHECK(board_leader(&board) == NULL);

    CHECK(board_add_team(&board, "Owls") == 0);
    CHECK(board_add_team(&board, "Bees") == 0);
    CHECK(board_add_team(&board, "Cats") == 0);
    CHECK(board.count == 3);
    CHECK(board_add_team(&board, "Owls") == -1);
    CHECK(board_add_team(&board, "") == -1);
    CHECK(board_add_team(&board, "This name is far too long to fit!!") == -1);

    Team *owls = board_find(&board, "Owls");
    CHECK(owls != NULL && strcmp(owls->name, "Owls") == 0 && owls->score == 0);
    CHECK(board_find(&board, "Dogs") == NULL);

    CHECK(board_add_points(&board, "Bees", 5) == 0);
    CHECK(board_add_points(&board, "Cats", 5) == 0);
    CHECK(board_add_points(&board, "Owls", 2) == 0);
    CHECK(board_add_points(&board, "Dogs", 1) == -1);

    const Team *leader = board_leader(&board);
    CHECK(leader != NULL && strcmp(leader->name, "Bees") == 0);

    board_sort(&board);
    CHECK(strcmp(board.teams[0].name, "Bees") == 0);
    CHECK(strcmp(board.teams[1].name, "Cats") == 0);
    CHECK(strcmp(board.teams[2].name, "Owls") == 0);

    Scoreboard full;
    full.count = 99;
    board_init(&full);
    char name[] = "Team A";
    for (int i = 0; i < MAX_TEAMS; i++) {
        name[5] = (char)('A' + i);
        board_add_team(&full, name);
    }
    CHECK(board_add_team(&full, "One too many") == -1);
    return check_summary();
}
