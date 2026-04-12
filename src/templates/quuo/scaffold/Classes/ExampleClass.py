from Utils.ExceptionsTools import CustomException
from Utils.GeneralTools import get_input_data
from Utils.Http.StatusCode import StatusCode
from Utils.TypingTools import APIResponseType, ConnType, EventType
from Utils.Validations import Validations, check_query_limit


EXAMPLE_NAME_MAX_LEN = 250


class ExampleClass:
    """Example logic class — replace with your real entity.

    Real-world usage of read_session / write_session (no aliasing):

        from sqlalchemy import select, insert
        from BaseModels.MyDomain.MyEntity import MyEntityModel

        stmt = select(MyEntityModel).filter_by(active=1)
        rows = self.db.read_session.query(stmt).as_dict()

        new_id = self.db.write_session.add(
            insert(MyEntityModel).values(name="X", active=1)
        )
    """

    updatable_properties = ['name']

    def __init__(self, db: ConnType):
        self.db: ConnType = db
        self.val = Validations()

    def get_items(self, event: EventType) -> APIResponseType:
        request = get_input_data(event)

        limit = None
        offset = 0
        if request and request.get("limit"):
            limit, offset = check_query_limit(
                request["limit"], request.get("offset", 0),
            )

        rows: list[dict] = []

        return {
            "statusCode": StatusCode(200),
            "data": {"items": rows, "limit": limit, "offset": offset},
        }

    def create_item(self, event: EventType) -> APIResponseType:
        request = get_input_data(event)

        validation_list = [
            self.val.param("name", str, request.get("name"), EXAMPLE_NAME_MAX_LEN),
        ]
        validated = self.val.validate(validation_list)
        if not validated['isValid']:
            raise CustomException(validated["data"])

        return {
            "statusCode": StatusCode(201),
            "data": {"name": request["name"]},
        }
