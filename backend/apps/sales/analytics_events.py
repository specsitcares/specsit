import queue
import logging

logger = logging.getLogger(__name__)

# A thread-safe global set of active event queues for SSE connections
_sse_queues = set()

def register_queue(q):
    """Register an active queue to receive events."""
    _sse_queues.add(q)
    logger.debug(f"Registered SSE queue. Active queues: {len(_sse_queues)}")

def unregister_queue(q):
    """Unregister an active queue when connection closes."""
    _sse_queues.discard(q)
    logger.debug(f"Unregistered SSE queue. Active queues: {len(_sse_queues)}")

def announce_change(event_type, data=None):
    """
    Broadcast an event to all registered queues.
    """
    event = {
        'type': event_type,
        'data': data or {}
    }
    # Create a copy of the set to iterate over safely in case of concurrent modifications
    for q in list(_sse_queues):
        try:
            q.put_nowait(event)
        except queue.Full:
            # If a queue is full, discard the oldest items to make space
            try:
                q.get_nowait()
                q.put_nowait(event)
            except Exception:
                pass
        except Exception as e:
            logger.error(f"Error putting event to queue: {e}")
