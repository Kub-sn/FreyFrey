import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { PlannerState } from '../lib/planner-data';
import type { AuthState, CloudSyncState } from '../app/types';
import type { SupabaseFamilyInvite } from '../lib/supabase';
import { humanizeAuthError } from '../lib/auth-errors';
import {
  fetchDocuments,
  fetchFamilyInvites,
  fetchFamilyMembers,
  fetchMeals,
  fetchNotes,
  fetchShoppingLists,
  fetchTodoLists,
} from '../lib/supabase';
import { applyCloudCollections } from '../lib/cloud-sync';

export function useCloudDataSync({
  authState,
  setPlannerState,
  setFamilyInvites,
  setCloudSync,
}: {
  authState: AuthState;
  setPlannerState: Dispatch<SetStateAction<PlannerState>>;
  setFamilyInvites: Dispatch<SetStateAction<SupabaseFamilyInvite[]>>;
  setCloudSync: Dispatch<SetStateAction<CloudSyncState>>;
}) {
  useEffect(() => {
    if (authState.stage !== 'authenticated' || !authState.family) {
      setFamilyInvites([]);
      setCloudSync({
        phase: 'idle',
        message: null,
        scope: null,
      });
      return;
    }

    let cancelled = false;
    const familyId = authState.family.familyId;

    const loadCloudCollections = async () => {
      setCloudSync({
        phase: 'loading',
        message: 'Alle Planer-Daten werden geladen.',
        scope: 'global',
      });

      try {
        const [shoppingLists, todoLists, notes, meals, documents, members, invites] = await Promise.all([
          fetchShoppingLists(familyId),
          fetchTodoLists(familyId),
          fetchNotes(familyId),
          fetchMeals(familyId),
          fetchDocuments(familyId),
          fetchFamilyMembers(familyId),
          fetchFamilyInvites(familyId),
        ]);

        if (cancelled) {
          return;
        }

        setPlannerState((current) => {
          const nextState = applyCloudCollections(current, {
            shoppingLists,
            todoLists,
            notes,
            meals,
            documents,
          });

          return {
            ...nextState,
            members,
            activeUserId: authState.profile?.id ?? nextState.activeUserId,
          };
        });
        setFamilyInvites(invites);
        setCloudSync({
          phase: 'ready',
          message: 'Alle Planer-Daten sind synchronisiert.',
          scope: 'global',
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCloudSync({
          phase: 'error',
          message: humanizeAuthError(error),
          scope: 'global',
        });
      }
    };

    void loadCloudCollections();

    return () => {
      cancelled = true;
    };
  }, [authState.family, authState.profile?.id, authState.stage, setCloudSync, setFamilyInvites, setPlannerState]);
}
