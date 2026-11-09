#include "check.h"
#include "ex07.h"

int main(void)
{
    Point p = make_point(3.0, 4.0);
    CHECK(CLOSE(p.x, 3.0) && CLOSE(p.y, 4.0));
    CHECK(CLOSE(distance(make_point(0, 0), p), 5.0));

    Rect r = {.top_left = {.x = 0, .y = 0}, .width = 4, .height = 2};
    CHECK(CLOSE(rect_area(&r), 8.0));
    CHECK(point_in_rect(make_point(1, 1), &r) == 1);
    CHECK(point_in_rect(make_point(4, 2), &r) == 1);
    CHECK(point_in_rect(make_point(5, 1), &r) == 0);

    Student s = {.name = "Ann", .scores = {90, 80, 70}};
    CHECK(CLOSE(student_average(&s), 80.0));

    move_point(&p, 1.0, -2.0);
    CHECK(CLOSE(p.x, 4.0) && CLOSE(p.y, 2.0));
    return check_summary();
}
