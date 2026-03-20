"""Tests for app/utils/haversine.py"""
import math
from app.utils.haversine import haversine


def test_same_point():
    """Distance between same point should be 0."""
    assert haversine(17.38, 78.48, 17.38, 78.48) == 0.0


def test_known_distance():
    """Hyderabad to Mumbai ~620 km."""
    dist = haversine(17.3850, 78.4867, 19.0760, 72.8777)
    assert 610 < dist < 630


def test_short_distance():
    """Two nearby points in Hyderabad."""
    dist = haversine(17.4325, 78.4673, 17.4156, 78.4347)
    assert 2 < dist < 6


def test_antipodal_points():
    """Points on opposite sides of the Earth ~20000 km."""
    dist = haversine(0, 0, 0, 180)
    assert abs(dist - math.pi * 6371) < 1


def test_north_south_pole():
    """North pole to south pole ~20015 km."""
    dist = haversine(90, 0, -90, 0)
    assert abs(dist - math.pi * 6371) < 1


def test_equator_points():
    """Two points on the equator 1 degree apart ~111 km."""
    dist = haversine(0, 0, 0, 1)
    assert 110 < dist < 113
