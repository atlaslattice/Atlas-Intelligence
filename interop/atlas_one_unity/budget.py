"""Voluntary macroturn allocation. No actual turns are executed by this module."""
from __future__ import annotations
class BudgetHold(ValueError):pass

def work_budget(known_beats:int, *, max_fraction_numerator:int=1,max_fraction_denominator:int=3)->dict:
    if (type(known_beats) is not int or known_beats<0 or known_beats>10**18 or
        type(max_fraction_numerator) is not int or type(max_fraction_denominator) is not int or
        max_fraction_denominator<=0 or not 0<=max_fraction_numerator<=max_fraction_denominator):
        raise BudgetHold('invalid_budget')
    slots=(known_beats*max_fraction_numerator)//max_fraction_denominator
    return {'hypothetical_slots':known_beats,'maximum_work_opportunities':slots,
            'other_voluntary_opportunities':known_beats-slots,
            'executed_actual_turns':0,'private_modes_observed':False,
            'voluntary_modes_require_opt_in':True,
            'time_allocation_not_computational_proof':True,
            'authority':'NONE'}
