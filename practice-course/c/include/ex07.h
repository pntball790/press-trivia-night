#ifndef EX07_H
#define EX07_H

typedef struct {
    double x;
    double y;
} Point;

typedef struct {
    Point top_left;      /* smallest x, smallest y */
    double width;
    double height;
} Rect;

typedef struct {
    char name[32];
    int scores[3];
} Student;

Point make_point(double x, double y);
double distance(Point a, Point b);
double rect_area(const Rect *r);
int point_in_rect(Point p, const Rect *r);
double student_average(const Student *s);
void move_point(Point *p, double dx, double dy);

#endif
