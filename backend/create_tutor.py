import argparse
import getpass
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app import create_app
from app.extensions import db
from app.models import User
from app.security import hash_password, validate_password


def main():
    parser = argparse.ArgumentParser(description="Create the first tutor account")
    parser.add_argument("--login", required=True)
    parser.add_argument("--first-name", required=True)
    parser.add_argument("--last-name", required=True)
    parser.add_argument("--city", default="Новосибирск")
    parser.add_argument("--timezone", default="Asia/Novosibirsk")
    args = parser.parse_args()

    try:
        ZoneInfo(args.timezone)
    except (ZoneInfoNotFoundError, ValueError):
        raise SystemExit("Некорректный IANA часовой пояс")

    app = create_app()
    with app.app_context():
        if User.query.filter_by(login=args.login.strip()).first():
            raise SystemExit("Пользователь с таким логином уже существует")

        password = getpass.getpass("Пароль репетитора: ")
        repeat = getpass.getpass("Повторите пароль: ")
        if password != repeat:
            raise SystemExit("Пароли не совпадают")
        error = validate_password(password)
        if error:
            raise SystemExit(error)

        user = User(
            login=args.login.strip(),
            password_hash=hash_password(password),
            role="tutor",
            first_name=args.first_name.strip(),
            last_name=args.last_name.strip(),
            city=args.city.strip(),
            timezone_name=args.timezone.strip(),
            lesson_price_rub=0,
            is_active=True
        )
        db.session.add(user)
        db.session.commit()
        print("Учётная запись репетитора создана")


if __name__ == "__main__":
    main()
