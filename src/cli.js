import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { gen } from "./graphql-codegen-modules-gen.mjs";

const argv =
  //.help("help")
  yargs(hideBin(process.argv))
    .scriptName("graphql-codegen-modules-gen")
    .usage("$0 <path_to_Modules>")
    .alias("h", "help")
    .alias("v", "version")
    .showHelpOnFail()
    .demandCommand(1).argv;

if (argv._.length === 1) {
  gen(argv._[0]);
} else {
  console.log("Invalid args, try -h for the help");
}
