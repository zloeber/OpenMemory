import { sys } from "./system";
import { mem } from "./memory";
import { dynroutes } from "./dynamics";
import { ide } from "./ide";
import { compression } from "./compression";
import { lg } from "./langgraph";
import { temporal } from "./temporal";
import { dash } from "./dashboard";
import { metrics_routes } from "./metrics";
import { chat_routes } from "./chat";

export function routes(app: any) {
    sys(app);
    mem(app);
    dynroutes(app);
    ide(app);
    compression(app);
    lg(app);
    temporal(app);
    dash(app);
    metrics_routes(app);
    chat_routes(app);
}

