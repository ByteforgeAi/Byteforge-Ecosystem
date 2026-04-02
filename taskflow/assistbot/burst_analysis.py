from typing import List, Dict, Any

def detect_volume_bursts(
    volumes: List[float],
    threshold_ratio: float = 1.5,
    min_interval: int = 1
) -> List[Dict[str, Any]]:
    """
    Identify indices where volume jumps by threshold_ratio over previous.
    Returns list of dicts: {index, previous, current, ratio, delta}.
    """
    events: List[Dict[str, Any]] = []
    last_idx = -min_interval
    for i in range(1, len(volumes)):
        prev, curr = volumes[i - 1], volumes[i]
        ratio = (curr / prev) if prev > 0 else float("inf")
        if ratio >= threshold_ratio and (i - last_idx) >= min_interval:
            events.append({
                "index": i,
                "previous": prev,
                "current": curr,
                "ratio": round(ratio, 4),
                "delta": round(curr - prev, 4),
            })
            last_idx = i
    return events


def summarize_bursts(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Summarize burst events: total count, average ratio, max delta.
    """
    if not events:
        return {"count": 0, "avg_ratio": 0.0, "max_delta": 0.0}

    count = len(events)
    avg_ratio = sum(e["ratio"] for e in events) / count
    max_delta = max(e["delta"] for e in events)

    return {
        "count": count,
        "avg_ratio": round(avg_ratio, 4),
        "max_delta": max_delta,
    }


def first_burst_index(events: List[Dict[str, Any]]) -> int:
    """
    Returns index of the first detected burst, or -1 if none.
    """
    return events[0]["index"] if events else -1
