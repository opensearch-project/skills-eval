import json
import sys

import numpy as np
import pandas as pd

INDEX_TYPES = {
    "float": float,
    "double": np.double,
    "keyword": str,
    "long": pd.Int64Dtype(),  # to handle missing value in the astype function
    "text": str,
    "object": str,  # there is no clear mapping from OS object to pd.dtypes
    "integer": pd.Int32Dtype(),
    "timestamp": str,
    "string": str,
    "array": str,
    "date": str,
    "struct": str,
    "ip": str,
    "boolean": bool,
}


def parse_run_result(resp):
    """
    Simple helper to parse response.

    Parameters
    ----------
    resp: dict
                Result of a successful call to
                run_sql_query() above.

    Returns
    -------
    result: DataFrame
                Query result as a pandas DataFrame.
    """
    names = [x["name"] for x in resp["schema"]]
    typing = {x["name"]: INDEX_TYPES[x["type"]] for x in resp["schema"]}
    return pd.DataFrame(resp["datarows"], columns=names).astype(typing)


def eval_execution_accuracy(pred_df, gold_df):
    """
    Problem: Data from two queries can be "same" but with:
        - permuted rows
        - permuted columns
        - identical columns but different column names

    Approach: Cast to pd.DataFrame and check for equivalence
    up to row and column permutation. Also checks types column-wise.
    """

    target_dtypes = pred_df.dtypes

    # Step 1: compare columns
    # best case: columns are the same and we can skip this part
    if set(gold_df.columns) != set(pred_df.columns):
        # otherwise try to find 1-1 mapping between df columns

        # start by subtracting out any columns with the same name in each df
        common_cols = list(set(gold_df.columns).intersection(set(pred_df.columns)))
        gold_cols = [x for x in list(gold_df.columns) if x not in common_cols]
        possible_col_matches = [
            x for x in list(pred_df.columns) if x not in common_cols
        ]

        # then look for 1-1 mapping among remaining cols
        for col in gold_cols:
            unmatched = True
            for pcol in possible_col_matches:
                try:  # first try to cast gold col to pred col type
                    gold_df = gold_df.astype({col: pred_df.dtypes[pcol]})

                    # round float columns to same number of decimals
                    if target_dtypes[pcol] == float:
                        gold_df = gold_df.round({col: 4})
                        pred_df = pred_df.round({pcol: 4})

                except:  # if it doesn't work, continue to next possible match
                    continue

                if set(gold_df[col].values) == set(
                    pred_df[pcol].values
                ):  # slightly weak
                    possible_col_matches.remove(pcol)
                    pred_df = pred_df.rename(
                        columns={pcol: col}
                    )  # rename pred col to match gold col

                    unmatched = False
                    break

            if unmatched:  # gold col not in pred cols: dfs can't be equal
                return False
        if len(possible_col_matches) > 0:
            return False  # pred df has extra, unmatched cols

    else:
        try:  # try to cast each gold col to its corresponding pred col type
            gold_df = gold_df.astype(
                {col: dtype for (col, dtype) in zip(pred_df.columns, pred_df.dtypes)}
            )

            # round float columns to same number of decimals
            for col in pred_df.columns:
                if pred_df.dtypes[col] == float:
                    gold_df = gold_df.round({col: 4})
                    pred_df = pred_df.round({col: 4})
        except:
            return False

    # Step 2: compare rows via outer join
    try:
        merged = gold_df.merge(
            pred_df, on=list(gold_df.columns), how="outer", indicator="exist"
        )
        # "exist" col in merged says whether the row came from left df, right df, or both
        return np.all(merged.exist == "both")

    except Exception:
        return False


def main():
    if len(sys.argv) < 3:
        raise ValueError("Model output and context are expected.")

    context = json.loads(sys.argv[2])
    received = context["receivedResponse"]
    expected = context["expectedResponse"]
    return eval_execution_accuracy(
        parse_run_result(received), parse_run_result(expected)
    )


print(main())
