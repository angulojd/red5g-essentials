from Auth.Utils.EventTools import authorized

from Classes.ExampleClass import ExampleClass


@authorized
def example_handler(event, context, conn):
    cls = ExampleClass(conn)
    methods = {
        "GET": cls.get_items,
        "POST": cls.create_item,
    }
    return methods[event['httpMethod']](event)
