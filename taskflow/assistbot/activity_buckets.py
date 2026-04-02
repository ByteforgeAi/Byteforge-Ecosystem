from typing import List, Dict, Any

def generate_activity_heatmap(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> List[float]:
    """
    Bucket activity counts into 'buckets' time intervals,
    returning either raw counts or normalized [0.0–1.0].
    - timestamps: list of epoch ms timestamps.
    - counts: list of integer counts per timestamp.
    """
    if not timestamps:
        return []

    t_min, t_max = min(timestamps), max(timestamps)
    span = t_max - t_min or 1
    bucket_size = span / buckets

    agg = [0] * buckets
    for t, c in zip(timestamps, counts):
        idx = min(buckets - 1, int((t - t_min) / bucket_size))
        agg[idx] += c

    if normalize:
        m = max(agg) or 1
        return [round(val / m, 4) for val in agg]
    return agg


def heatmap_with_intervals(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> List[Dict[str, Any]]:
    """
    Returns a heatmap with interval ranges and values for each bucket.
    """
    if not timestamps:
        return []

    t_min, t_max = min(timestamps), max(timestamps)
    span = t_max - t_min or 1
    bucket_size = span / buckets

    agg = [0] * buckets
    for t, c in zip(timestamps, counts):
        idx = min(buckets - 1, int((t - t_min) / bucket_size))
        agg[idx] += c

    if normalize:
        m = max(agg) or 1
        agg = [round(val / m, 4) for val in agg]

    result = []
    for i, val in enumerate(agg):
        start = t_min + i * bucket_size
        end = t_min + (i + 1) * bucket_size
        result.append({"bucket": i, "start": int(start), "end": int(end), "value": val})

    return result


def detect_peak_bucket(heatmap: List[float]) -> int:
    """
    Returns the index of the bucket with the highest value.
    """
    if not heatmap:
        return -1
    return max(range(len(heatmap)), key=lambda i: heatmap[i])
