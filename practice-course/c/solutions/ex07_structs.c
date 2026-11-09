/*
 * LESSON 7 - Structs (and typedef)
 * Read more: https://www.w3schools.com/c/c_structs.php
 *            https://www.w3schools.com/c/c_typedef.php
 *
 * A struct groups related variables. See include/ex07.h for Point, Rect, Student.
 *
 *     typedef struct {
 *         double x;
 *         double y;
 *     } Point;
 *
 *     Point p = {3.0, 4.0};    // or {.x = 3.0, .y = 4.0}
 *     p.x = 5.0;               // dot for a struct
 *     Point *pp = &p;
 *     pp->y = 1.0;             // arrow for a POINTER to a struct  (same as (*pp).y)
 *
 * BEST PRACTICES
 * - Put struct definitions in a header (.h) so other files can use them.
 * - Pass big structs by pointer (const Rect *r) to avoid copying them.
 * - Use designated initialisers {.x = 1, .y = 2} - clearer and safer.
 *
 * Run:  ./run.sh 7
 */
#include <math.h>
#include <stddef.h>
#include "ex07.h"

Point make_point(double x, double y)
{
    /* Build and return a Point. */
    Point p = {.x = x, .y = y};
    return p;
}

double distance(Point a, Point b)
{
    /* sqrt(dx*dx + dy*dy). sqrt() is in <math.h>. */
    double dx = b.x - a.x;
    double dy = b.y - a.y;
    return sqrt(dx * dx + dy * dy);
}

double rect_area(const Rect *r)
{
    /* width * height. r is a pointer, so use r->width. */
    return r->width * r->height;
}

int point_in_rect(Point p, const Rect *r)
{
    /* 1 if p is inside r (edges count as inside), else 0. */
    return p.x >= r->top_left.x && p.x <= r->top_left.x + r->width &&
           p.y >= r->top_left.y && p.y <= r->top_left.y + r->height;
}

double student_average(const Student *s)
{
    /* Average of the student's 3 scores. */
    const size_t count = sizeof(s->scores) / sizeof(s->scores[0]);
    int total = 0;
    for (size_t i = 0; i < count; i++) {
        total += s->scores[i];
    }
    return (double)total / (double)count;
}

void move_point(Point *p, double dx, double dy)
{
    /* Change the caller's point by dx, dy. */
    p->x += dx;
    p->y += dy;
}
