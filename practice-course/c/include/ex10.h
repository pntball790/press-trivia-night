#ifndef EX10_H
#define EX10_H

#include <stddef.h>

#define MAX_TEAMS 8
#define NAME_LEN 32

typedef struct {
    char name[NAME_LEN];
    int score;
} Team;

typedef struct {
    Team teams[MAX_TEAMS];
    size_t count;
} Scoreboard;

void board_init(Scoreboard *board);
int board_add_team(Scoreboard *board, const char *name);
Team *board_find(Scoreboard *board, const char *name);
int board_add_points(Scoreboard *board, const char *name, int points);
void board_sort(Scoreboard *board);
const Team *board_leader(const Scoreboard *board);

#endif
