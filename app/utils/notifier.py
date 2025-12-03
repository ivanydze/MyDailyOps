from win10toast import ToastNotifier

_notifier = ToastNotifier()

def show_deadline_notification(text: str):
    _notifier.show_toast(
        "Upcoming Task Deadline",
        text,
        duration=5,
        threaded=True
    )
