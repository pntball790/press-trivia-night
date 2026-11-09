/*
 * LESSON 10 - Mini Project: Trivia Night Scoreboard
 * Puts lessons 1-9 together: structs, arrays, strings, pointers and qsort.
 * The types are in include/ex10.h - read them first.
 *
 *     Scoreboard board;
 *     board_init(&board);
 *     board_add_team(&board, "Owls");
 *     board_add_points(&board, "Owls", 3);
 *     board_sort(&board);                  // highest score first
 *     board_leader(&board)->name           // "Owls"
 *
 * qsort (from <stdlib.h>) sorts any array if you give it a compare function:
 *     qsort(array, count, sizeof array[0], compare);
 *     compare(a, b) returns <0 if a goes first, >0 if b goes first, 0 if equal.
 *
 * Run:  ./run.sh 10
 */
#include <stdlib.h>
#include <string.h>
#include "ex10.h"

void board_init(Scoreboard *board)
{
    /* Start empty: count = 0. */
    board->count = 0;
}

int board_add_team(Scoreboard *board, const char *name)
{
    /* Add a team with score 0. Return 0 on success, -1 if the board is full
       (MAX_TEAMS), the name is empty or too long (must fit in NAME_LEN with '\0'),
       or the team already exists. Copy the name with strcpy after checking length. */
    size_t len = strlen(name);
    if (board->count >= MAX_TEAMS || len == 0 || len >= NAME_LEN) {
        return -1;
    }
    if (board_find(board, name) != NULL) {
        return -1;
    }
    Team *team = &board->teams[board->count];
    strcpy(team->name, name);
    team->score = 0;
    board->count++;
    return 0;
}

Team *board_find(Scoreboard *board, const char *name)
{
    /* Return a pointer to the team with this name (use strcmp), or NULL. */
    for (size_t i = 0; i < board->count; i++) {
        if (strcmp(board->teams[i].name, name) == 0) {
            return &board->teams[i];
        }
    }
    return NULL;
}

int board_add_points(Scoreboard *board, const char *name, int points)
{
    /* Add points to the named team. Return 0, or -1 if the team doesn't exist. */
    Team *team = board_find(board, name);
    if (team == NULL) {
        return -1;
    }
    team->score += points;
    return 0;
}

/* Compare function for qsort: higher score first, ties by name A-Z. */
static int compare_teams(const void *a, const void *b)
{
    const Team *ta = a;
    const Team *tb = b;
    if (ta->score != tb->score) {
        return tb->score - ta->score;
    }
    return strcmp(ta->name, tb->name);
}

void board_sort(Scoreboard *board)
{
    /* Sort teams with qsort and compare_teams. */
    qsort(board->teams, board->count, sizeof board->teams[0], compare_teams);
}

const Team *board_leader(const Scoreboard *board)
{
    /* Return the team with the highest score (first one wins a tie), or NULL if empty.
       Don't sort here - just loop. */
    if (board->count == 0) {
        return NULL;
    }
    const Team *best = &board->teams[0];
    for (size_t i = 1; i < board->count; i++) {
        if (board->teams[i].score > best->score) {
            best = &board->teams[i];
        }
    }
    return best;
}
