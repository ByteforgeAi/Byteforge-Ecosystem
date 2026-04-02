import math
from typing import List, Dict, Any

def compute_shannon_entropy(addresses: List[str]) -> float:
    """
    Compute Shannon entropy (bits) of an address sequence.
    """
    if not addresses:
        return 0.0
    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1
    total = len(addresses)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        entropy -= p * math.log2(p)
    return round(entropy, 4)


def entropy_breakdown(addresses: List[str]) -> Dict[str, Any]:
    """
    Returns both overall entropy and distribution details.
    """
    if not addresses:
        return {"entropy": 0.0, "distribution": {}}
    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1
    total = len(addresses)
    distribution = {a: round(count / total, 4) for a, count in freq.items()}
    return {"entropy": compute_shannon_entropy(addresses), "distribution": distribution}


def normalized_entropy(addresses: List[str]) -> float:
    """
    Computes normalized entropy in range [0,1],
    dividing by log2 of unique address count.
    """
    if not addresses:
        return 0.0
    unique_count = len(set(addresses))
    if unique_count == 1:
        return 0.0
    raw_entropy = compute_shannon_entropy(addresses)
    max_entropy = math.log2(unique_count)
    return round(raw_entropy / max_entropy, 4)
